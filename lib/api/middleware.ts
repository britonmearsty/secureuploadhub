/**
 * Shared API Middleware
 * Consolidates common authentication, validation, and error handling logic
 * across all API routes to eliminate duplication
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodSchema, ZodError } from "zod"

/**
 * Standard API error responses
 */
export const ApiErrors = {
  UNAUTHORIZED: { error: "Unauthorized", status: 401 },
  FORBIDDEN: { error: "Forbidden", status: 403 },
  NOT_FOUND: { error: "Not found", status: 404 },
  BAD_REQUEST: { error: "Bad request", status: 400 },
  INTERNAL_ERROR: { error: "Internal server error", status: 500 },
  VALIDATION_ERROR: { error: "Validation error", status: 422 },
  RATE_LIMITED: { error: "Rate limited", status: 429 }
} as const

/**
 * API Response utilities
 */
export class ApiResponse {
  static success<T>(data: T, status: number = 200) {
    return NextResponse.json(data, { status })
  }

  static error(error: keyof typeof ApiErrors, details?: string | object) {
    const errorConfig = ApiErrors[error]
    const response = details 
      ? { ...errorConfig, details }
      : errorConfig
    return NextResponse.json(response, { status: errorConfig.status })
  }

  static validationError(errors: ZodError) {
    return NextResponse.json({
      error: "Validation error",
      details: errors.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    }, { status: 422 })
  }
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (request: NextRequest, session: any, ...args: any[]) => Promise<NextResponse>,
  options: {
    requireAdmin?: boolean
    requireRole?: string[]
  } = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const session = await auth()

      if (!session?.user?.id) {
        return ApiResponse.error('UNAUTHORIZED')
      }

      // Check admin requirement
      if (options.requireAdmin && session.user.role !== 'admin') {
        return ApiResponse.error('FORBIDDEN', 'Admin access required')
      }

      // Check role requirement
      if (options.requireRole && !options.requireRole.includes(session.user.role || 'user')) {
        return ApiResponse.error('FORBIDDEN', `Required role: ${options.requireRole.join(' or ')}`)
      }

      return await handler(request, session, ...args)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return ApiResponse.error('INTERNAL_ERROR')
    }
  }
}

/**
 * Request validation middleware
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (request: NextRequest, data: any, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return await handler(request, validatedData, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiResponse.validationError(error)
      }
      console.error('Validation middleware error:', error)
      return ApiResponse.error('BAD_REQUEST')
    }
  }
}

/**
 * Query parameter validation middleware
 */
export function withQueryValidation<T extends ZodSchema>(
  schema: T,
  handler: (request: NextRequest, query: any, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const searchParams = request.nextUrl.searchParams
      const queryObject = Object.fromEntries(searchParams.entries())
      const validatedQuery = schema.parse(queryObject)
      return await handler(request, validatedQuery, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiResponse.validationError(error)
      }
      console.error('Query validation middleware error:', error)
      return ApiResponse.error('BAD_REQUEST')
    }
  }
}

/**
 * Error handling middleware
 */
export function withErrorHandling(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API error:', error)
      
      // Handle specific error types
      if (error instanceof ZodError) {
        return ApiResponse.validationError(error)
      }
      
      if (error instanceof Error) {
        // Check for known error patterns
        if (error.message.includes('Unauthorized')) {
          return ApiResponse.error('UNAUTHORIZED')
        }
        if (error.message.includes('Not found')) {
          return ApiResponse.error('NOT_FOUND')
        }
        if (error.message.includes('Forbidden')) {
          return ApiResponse.error('FORBIDDEN')
        }
      }
      
      return ApiResponse.error('INTERNAL_ERROR')
    }
  }
}

/**
 * Logging middleware
 */
export function withLogging(
  routeName: string,
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    const startTime = Date.now()
    console.log(`🔍 ${routeName}: Request received`)
    
    try {
      const result = await handler(...args)
      const duration = Date.now() - startTime
      console.log(`✅ ${routeName}: Success (${duration}ms)`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ ${routeName}: Error (${duration}ms):`, error)
      throw error
    }
  }
}

/**
 * Ownership validation middleware
 * Validates that the user owns the resource they're trying to access
 */
export async function validateOwnership(
  userId: string,
  resourceType: 'portal' | 'upload' | 'storageAccount',
  resourceId: string
): Promise<boolean> {
  const { default: prisma } = await import("@/lib/prisma")
  
  try {
    switch (resourceType) {
      case 'portal':
        const portal = await prisma.uploadPortal.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        })
        return portal?.userId === userId
        
      case 'upload':
        const upload = await prisma.fileUpload.findUnique({
          where: { id: resourceId },
          include: { portal: { select: { userId: true } } }
        })
        return upload?.portal.userId === userId
        
      case 'storageAccount':
        const storageAccount = await prisma.storageAccount.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        })
        return storageAccount?.userId === userId
        
      default:
        return false
    }
  } catch (error) {
    console.error('Ownership validation error:', error)
    return false
  }
}

/**
 * Ownership middleware wrapper
 */
export function withOwnership(
  resourceType: 'portal' | 'upload' | 'storageAccount',
  getResourceId: (request: NextRequest, params?: any) => string
) {
  return function(
    handler: (request: NextRequest, session: any, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, session: any, ...args: any[]): Promise<NextResponse> => {
      const resourceId = getResourceId(request, args[0])
      const isOwner = await validateOwnership(session.user.id, resourceType, resourceId)
      
      if (!isOwner) {
        return ApiResponse.error('FORBIDDEN', 'You do not own this resource')
      }
      
      return await handler(request, session, ...args)
    }
  }
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

/**
 * Common middleware combinations
 */
export const withAuthAndLogging = (routeName: string) => 
  (handler: (request: NextRequest, session: any, ...args: any[]) => Promise<NextResponse>) =>
    withErrorHandling(withLogging(routeName, withAuth(handler)))

export const withAuthValidationAndLogging = <T extends ZodSchema>(routeName: string, schema: T) =>
  (handler: (request: NextRequest, data: any, ...args: any[]) => Promise<NextResponse>) =>
    withErrorHandling(withLogging(routeName, withAuth(withValidation(schema, handler))))