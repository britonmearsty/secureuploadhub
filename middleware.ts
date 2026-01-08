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

  // Only log blocked or redirected requests to reduce noise
  const shouldLog = !isAuth && (isOnAdmin || isOnDashboard) || (isAuth && isOnAuthPage)

  if (shouldLog) {
    console.log(`🔄 MIDDLEWARE: ${pathname} | Auth: ${isAuth} | Admin: ${isOnAdmin} | Dashboard: ${isOnDashboard} | AuthPage: ${isOnAuthPage}`)
  }

  // Protect admin routes - require authentication (role check happens server-side in layout)
  if (isOnAdmin && !isAuth) {
    console.log(`🚫 MIDDLEWARE: Redirecting unauthenticated user from ${pathname} to /auth/signin`)
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Protect dashboard routes
  if (isOnDashboard && !isAuth) {
    console.log(`🚫 MIDDLEWARE: Redirecting unauthenticated user from ${pathname} to /auth/signin`)
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Prevent cross-contamination: ensure admin communication routes are separate from user communication
  if (pathname.includes("/communication")) {
    if (isOnAdmin && pathname.includes("/dashboard/communication")) {
      console.log(`🚫 MIDDLEWARE: Preventing admin access to user communication routes`)
      return NextResponse.redirect(new URL("/admin/communication", request.url))
    }
    if (isOnDashboard && pathname.includes("/admin/communication")) {
      console.log(`🚫 MIDDLEWARE: Preventing user access to admin communication routes`)
      return NextResponse.redirect(new URL("/dashboard/communication", request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  // Default to dashboard, admin users can navigate to /admin manually
  if (isAuth && isOnAuthPage) {
    console.log(`➡️ MIDDLEWARE: Redirecting authenticated user from ${pathname} to /dashboard`)
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Only log successful requests for important routes
  if (shouldLog) {
    console.log(`✅ MIDDLEWARE: Allowing request to ${pathname}`)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

