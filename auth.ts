import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Dropbox from "next-auth/providers/dropbox"
import type { NextAuthConfig } from "next-auth"

// Shared auth configuration (Edge-compatible, no Prisma)
export const authConfig: NextAuthConfig = {
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAuthPage = nextUrl.pathname.startsWith("/auth")

      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to login
      }

      return true
    },
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

