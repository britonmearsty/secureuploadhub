import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export interface CommunicationAuthResult {
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
 * Authenticate user for communication endpoints
 */
export async function authenticateCommunication(requiredRole?: 'admin' | 'user'): Promise<CommunicationAuthResult> {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized - No session',
        statusCode: 401
      }
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true
      }
    })
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404
      }
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'Account disabled',
        statusCode: 403
      }
    }

    // Check role if required
    if (requiredRole && user.role !== requiredRole) {
      return {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403
      }
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error('Communication authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500
    }
  }
}

/**
 * Check if user can access a specific ticket
 */
export async function canAccessTicket(userId: string, ticketId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true
  
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId }
  })
  
  return !!ticket
}

/**
 * Check if user can modify a specific ticket
 */
export async function canModifyTicket(userId: string, ticketId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true
  
  const ticket = await prisma.ticket.findFirst({
    where: { 
      id: ticketId, 
      userId, 
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] } 
    }
  })
  
  return !!ticket
}

/**
 * Middleware helper for communication routes
 */
export async function requireCommunicationAuth(requiredRole?: 'admin' | 'user') {
  const authResult = await authenticateCommunication(requiredRole)
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }
  
  return null // No error, continue
}

/**
 * Get authenticated user or throw error
 */
export async function getAuthenticatedCommunicationUser(requiredRole?: 'admin' | 'user') {
  const authResult = await authenticateCommunication(requiredRole)
  
  if (!authResult.success) {
    throw new Error(authResult.error || 'Authentication failed')
  }
  
  return authResult.user!
}