import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validateSessionToken } from "@/lib/session-validation"

/**
 * Check if user is authenticated based on database session cookie
 */
function isAuthenticated(request: NextRequest): boolean {
  // Database sessions use different cookie names than JWT sessions
  const sessionToken = request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value
  
  return !!sessionToken
}

/**
 * Get session token from request cookies
 */
function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value
    || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuth = isAuthenticated(request)
  const sessionToken = getSessionToken(request)
  const isOnAdmin = pathname.startsWith("/admin")
  const isOnDashboard = pathname.startsWith("/dashboard")
  const isOnAuthPage = pathname.startsWith("/auth")

  // For protected routes, validate session exists in database
  if (isAuth && sessionToken && (isOnAdmin || isOnDashboard)) {
    try {
      const isValidSession = await validateSessionToken(sessionToken)
      
      if (!isValidSession) {
        // Session deleted from database, clear cookie and redirect
        console.log('Invalid session detected, clearing cookie and redirecting to signin')
        const response = NextResponse.redirect(new URL("/auth/signin", request.url))
        response.cookies.delete("authjs.session-token")
        response.cookies.delete("__Secure-authjs.session-token")
        return response
      }
    } catch (error) {
      // Database error during session validation
      console.error('Session validation error in middleware:', error)
      // Allow through - layout components will handle the validation
      // This prevents blocking users during database issues
    }
  }

  // Protect admin routes - require authentication (role check happens server-side in layout)
  if (isOnAdmin && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Protect dashboard routes
  if (isOnDashboard && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Redirect authenticated users away from auth pages
  // Role-specific redirect happens in layout components
  if (isAuth && isOnAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

