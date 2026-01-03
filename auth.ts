import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Dropbox from "next-auth/providers/dropbox"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendSignInNotification, sendWelcomeEmail } from "@/lib/email-templates"
import { headers } from "next/headers"

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
          scope: "files.metadata.read files.content.write files.content.read",
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
      // Handle explicit URLs first
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      
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

          // Send sign-in notification using new email template service
          await sendSignInNotification({
            to: user.email,
            userFirstname: user.name?.split(' ')[0],
            signInDate: new Date().toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'long',
            }),
            signInDevice: userAgent,
            signInLocation: ip,
          });
        } catch (error) {
          console.error("Failed to send sign-in notification:", error);
        }
      }
    },
  },
})

