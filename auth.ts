import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Dropbox from "next-auth/providers/dropbox"
import type { NextAuthConfig } from "next-auth"

// Shared auth configuration (Edge-compatible, no Prisma)
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
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
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.role) {
        session.user.role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnAuthPage = nextUrl.pathname.startsWith("/auth")
      const role = auth?.user?.role

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && isOnAuthPage) {
        if (role === 'admin') {
          return Response.redirect(new URL("/admin", nextUrl))
        }
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Protect admin routes - only admins allowed
      if (isOnAdmin) {
        if (!isLoggedIn) return false // Redirect to login
        if (role !== 'admin') {
          return Response.redirect(new URL("/dashboard", nextUrl)) // Redirect non-admins
        }
        return true // Allow admin access
      }

      // Protect dashboard routes - any authenticated user allowed
      if (isOnDashboard) {
        return isLoggedIn
      }

      return true
    },
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

