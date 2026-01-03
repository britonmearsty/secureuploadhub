import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Check if user is authenticated based on database session cookie
 */
function isAuthenticated(request: NextRequest): boolean {
  // Database sessions use different cookie names than JWT sessions
  const sessionToken = request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value
  
  return !!sessionToken
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuth = isAuthenticated(request)
  const isOnAdmin = pathname.startsWith("/admin")
  const isOnDashboard = pathname.startsWith("/dashboard")
  const isOnAuthPage = pathname.startsWith("/auth")

  // Protect admin routes - require authentication (role check happens server-side in layout)
  if (isOnAdmin && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Protect dashboard routes
  if (isOnDashboard && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Redirect authenticated users away from auth pages
  // Default to dashboard, admin users can navigate to /admin manually
  if (isAuth && isOnAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

