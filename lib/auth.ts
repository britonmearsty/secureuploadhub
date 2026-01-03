import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { authConfig } from "@/auth"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendSignInNotification, sendWelcomeEmail } from "@/lib/email-templates"
import { headers } from "next/headers"

// Full auth config with Prisma adapter for server-side use
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role || 'user' // Add role from database user
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect based on user role
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
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

