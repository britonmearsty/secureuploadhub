import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFreshUserData } from '@/lib/session-validation'

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    name: string | null
    role: string
    status: string
  }
  error?: string
  statusCode?: number
}

/**
 * Enhanced API authentication with fresh user data validation
 * Checks session, user existence, status, and role
 */
export async function authenticateAPI(requiredRole?: 'admin' | 'user'): Promise<AuthResult> {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized - No session',
        statusCode: 401
      }
    }

    // Get fresh user data to ensure status and role are current
    const freshUser = await getFreshUserData(session.user.id)
    
    if (!freshUser) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404
      }
    }

    // Check if user account is active
    if (freshUser.status !== 'active') {
      return {
        success: false,
        error: 'Account disabled',
        statusCode: 403
      }
    }

    // Check role if required
    if (requiredRole && freshUser.role !== requiredRole) {
      return {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403
      }
    }

    return {
      success: true,
      user: {
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        role: freshUser.role,
        status: freshUser.status
      }
    }
  } catch (error) {
    console.error('API authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500
    }
  }
}

/**
 * Middleware helper for API routes
 * Returns NextResponse with error or null if authenticated
 */
export async function requireAuth(requiredRole?: 'admin' | 'user'): Promise<NextResponse | null> {
  const authResult = await authenticateAPI(requiredRole)
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode || 500 }
    )
  }
  
  return null
}

/**
 * Get authenticated user for API routes
 * Returns user data or throws error response
 */
export async function getAuthenticatedUser(requiredRole?: 'admin' | 'user') {
  const authResult = await authenticateAPI(requiredRole)
  
  if (!authResult.success) {
    throw NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode || 500 }
    )
  }
  
  return authResult.user!
}