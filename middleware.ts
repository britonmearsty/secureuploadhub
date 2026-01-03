import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session with user data
  const session = await auth()
  const isAuth = !!session?.user
  const userRole = session?.user?.role

  const isOnAdmin = pathname.startsWith("/admin")
  const isOnDashboard = pathname.startsWith("/dashboard")
  const isOnAuthPage = pathname.startsWith("/auth")

  // Protect admin routes - require authentication and admin role
  if (isOnAdmin) {
    if (!isAuth) {
      return NextResponse.redirect(new URL("/auth/signin", request.url))
    }
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Protect dashboard routes
  if (isOnDashboard && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Redirect authenticated users away from auth pages
  if (isAuth && isOnAuthPage) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

