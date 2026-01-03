import prisma from '@/lib/prisma'

/**
 * Validate session token exists in database
 * Used by middleware for lightweight session validation
 */
export async function validateSessionToken(sessionToken: string): Promise<boolean> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      select: { sessionToken: true, expires: true }
    })
    
    if (!session) {
      return false
    }
    
    // Check if session is expired
    if (session.expires < new Date()) {
      // Clean up expired session
      await prisma.session.delete({
        where: { sessionToken }
      }).catch(() => {}) // Ignore errors, might already be deleted
      return false
    }
    
    return true
  } catch (error) {
    console.error('Session validation error:', error)
    // On database errors, assume session is valid to avoid blocking users
    // The layout components will handle the actual validation
    return true
  }
}

/**
 * Get fresh user data for session validation
 * Used by layouts to ensure user status and role are current
 */
export async function getFreshUserData(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        role: true, 
        status: true, 
        theme: true,
        email: true,
        name: true
      }
    })
    
    return user
  } catch (error) {
    console.error('Error fetching fresh user data:', error)
    return null
  }
}