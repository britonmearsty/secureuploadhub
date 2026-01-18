import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Dropbox from "next-auth/providers/dropbox"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendSignInNotification, sendWelcomeEmail } from "@/lib/email-templates"
import { headers } from "next/headers"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"

// Consolidated auth configuration with database sessions
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
      profile: (profile) => {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
    Dropbox({
      clientId: process.env.DROPBOX_CLIENT_ID!,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          token_access_type: "offline",
          scope: "openid email profile files.metadata.read files.content.write files.content.read",
        },
      },
      profile: async (profile) => {
        return {
          id: profile.account_id,
          name: profile.name?.display_name || profile.email || "User",
          email: profile.email,
          image: profile.profile_photo_url,
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role || 'user' // Add role from database user
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Reduce logging noise - only log non-standard redirects
      if (!url.includes('/dashboard')) {
        console.log(`🔄 AUTH REDIRECT: url=${url}, baseUrl=${baseUrl}`)
      }

      // Handle explicit URLs first
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      if (url.startsWith(baseUrl)) {
        return url
      }

      // Default redirect after sign-in
      return `${baseUrl}/dashboard`
    },
    async signIn({ user, account }) {
      // Allow linking accounts with same email
      let isNewUser = false;

      if (account?.provider && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          // Check if this provider is already linked
          const existingAccount = existingUser.accounts.find(
            (acc: any) => acc.provider === account.provider
          )

          if (!existingAccount) {
            // Link the new provider to the existing user
            try {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              })

              // ENHANCED: Auto-detect storage accounts based on user's login email
              if (["google", "dropbox"].includes(account.provider)) {
                try {
                  const result = await SingleEmailStorageManager.autoDetectStorageAccount(
                    existingUser.id,
                    account.provider as "google" | "dropbox",
                    account.providerAccountId
                  )

                  if (result.success) {
                    console.log(`✅ SIGNIN: StorageAccount ${result.created ? 'created' : 'updated'} for ${account.provider} (${result.storageAccountId})`)
                  } else {
                    console.error(`❌ SIGNIN: Failed to auto-detect StorageAccount for ${account.provider}:`, result.error)
                  }
                } catch (error) {
                  console.error(`❌ SIGNIN: Exception auto-detecting StorageAccount for ${account.provider}:`, error)
                  // Don't block sign-in for StorageAccount creation failures
                }
              }
            } catch (error) {
              console.error("Failed to link account during signin:", error)
              // Don't block signin if account linking fails
            }
          }
        } else {
          isNewUser = true;
        }
      }

      // Track sign-in event with PostHog on server side
      if (user.id || user.email) {
        try {
          const posthog = getPostHogClient();
          const distinctId = user.id || user.email!;

          // Identify user on server side
          posthog.identify({
            distinctId,
            properties: {
              email: user.email,
              name: user.name,
            }
          });

          // Capture server-side login event
          posthog.capture({
            distinctId,
            event: 'server_login',
            properties: {
              provider: account?.provider,
              is_new_user: isNewUser,
              source: 'oauth',
            }
          });
        } catch (error) {
          console.error("PostHog tracking failed:", error);
          // Don't block signin if analytics fail
        }
      }

      // Send welcome email to new users
      if (isNewUser && user.email) {
        sendWelcomeEmail({
          to: user.email,
          userFirstname: user.name?.split(' ')[0],
          dashboardUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
        }).catch((err) => {
          console.error("Failed to send welcome email:", err);
        });
      }

      return true
    },
  },
  events: {
    async signIn({ user }) {
      if (user.email) {
        try {
          const headerList = await headers();
          const userAgent = headerList.get("user-agent") || "Unknown Device";
          const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "Unknown IP";

          // Send sign-in notification using new email template service (non-blocking)
          sendSignInNotification({
            to: user.email,
            userFirstname: user.name?.split(' ')[0],
            signInDate: new Date().toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'long',
            }),
            signInDevice: userAgent,
            signInLocation: ip,
          }).catch((error) => {
            console.error("Failed to send sign-in notification:", error);
          });
        } catch (error) {
          console.error("Failed to send sign-in notification:", error);
        }
      }
    },
    async linkAccount({ user, account }) {
      // This event fires when an OAuth account is linked to a user
      // This handles both new user creation and linking additional accounts
      console.log(`🔗 LINK_ACCOUNT EVENT: userId=${user.id}, provider=${account?.provider}, providerAccountId=${account?.providerAccountId}`)

      if (user.id && account && ["google", "dropbox"].includes(account.provider)) {
        try {
          // Enhanced logging for Google Drive specifically
          if (account.provider === "google") {
            console.log(`🔍 GOOGLE_LINK: Starting Google Drive StorageAccount creation for user ${user.id}`)
            console.log(`🔍 GOOGLE_LINK: User email: ${user.email}`)
            console.log(`🔍 GOOGLE_LINK: Provider account ID: ${account.providerAccountId}`)
            console.log(`🔍 GOOGLE_LINK: Has access token: ${!!account.access_token}`)
            console.log(`🔍 GOOGLE_LINK: Has refresh token: ${!!account.refresh_token}`)
          }

          const result = await SingleEmailStorageManager.autoDetectStorageAccount(
            user.id,
            account.provider as "google" | "dropbox",
            account.providerAccountId
          )

          if (result.success) {
            console.log(`✅ LINK_ACCOUNT: StorageAccount ${result.created ? 'created' : 'updated'} for ${account.provider} (${result.storageAccountId})`)

            // Additional success logging for Google Drive
            if (account.provider === "google") {
              console.log(`🎉 GOOGLE_LINK: SUCCESS - Google Drive StorageAccount ${result.storageAccountId} ${result.created ? 'created' : 'updated'} for user ${user.email}`)
            }
          } else {
            console.error(`❌ LINK_ACCOUNT: Failed to auto-detect StorageAccount for ${account.provider}:`, result.error)

            // Enhanced error logging for Google Drive
            if (account.provider === "google") {
              console.error(`🚨 GOOGLE_LINK: CRITICAL FAILURE - Google Drive StorageAccount creation failed for user ${user.email}`)
              console.error(`🚨 GOOGLE_LINK: Error details:`, {
                userId: user.id,
                userEmail: user.email,
                providerAccountId: account.providerAccountId,
                error: result.error,
                emailMismatch: result.emailMismatch
              })

              // Try to create audit log for tracking
              try {
                await prisma.auditLog.create({
                  data: {
                    userId: user.id,
                    action: 'GOOGLE_STORAGE_CREATION_FAILED',
                    resource: 'StorageAccount',
                    resourceId: account.providerAccountId,
                    details: {
                      provider: 'google',
                      providerAccountId: account.providerAccountId,
                      error: result.error,
                      userEmail: user.email,
                      timestamp: new Date().toISOString(),
                      context: 'linkAccount_event',
                      severity: 'ERROR'
                    }
                  }
                })
                console.log(`📝 GOOGLE_LINK: Created audit log for failed StorageAccount creation`)
              } catch (auditError) {
                console.error(`❌ GOOGLE_LINK: Failed to create audit log:`, auditError)
              }
            }
          }
        } catch (error) {
          console.error(`❌ LINK_ACCOUNT: Exception auto-detecting StorageAccount for ${account.provider}:`, error)

          // Enhanced exception logging for Google Drive
          if (account.provider === "google") {
            console.error(`🚨 GOOGLE_LINK: EXCEPTION - Unexpected error during Google Drive StorageAccount creation`)
            console.error(`🚨 GOOGLE_LINK: Exception details:`, {
              userId: user.id,
              userEmail: user.email,
              providerAccountId: account.providerAccountId,
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            })
          }

          // Don't throw error - we don't want to break OAuth flow
        }
      } else {
        console.log(`ℹ️ LINK_ACCOUNT: Skipped - not a storage provider or missing data`)

        // Log what we received for debugging
        if (account) {
          console.log(`ℹ️ LINK_ACCOUNT: Account details - provider: ${account.provider}, userId: ${user.id}`)
        }
      }
    },

    // NEW: Additional event handlers for comprehensive coverage
    async createUser({ user }) {
      // This event fires when a new user is created
      console.log(`👤 CREATE_USER EVENT: userId=${user.id}, email=${user.email}`)

      // Note: At this point, OAuth accounts haven't been created yet
      // StorageAccount creation will happen in linkAccount event
    },

    async updateUser({ user }) {
      // This event fires when user data is updated
      console.log(`🔄 UPDATE_USER EVENT: userId=${user.id}, email=${user.email}`)

      // Note: With single email enforcement, we don't need complex consistency checks
      // The single email manager handles this automatically
    },
  },
})

