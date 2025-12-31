/**
 * Portal configuration caching
 * Reduces repeated database queries during uploads
 */

import { redis } from "@/lib/redis"
import prisma from "@/lib/prisma"

const CACHE_TTL = 3600 // 1 hour

export interface CachedPortal {
  id: string
  userId: string
  name: string
  slug: string
  isActive: boolean
  maxFileSize: number
  allowedFileTypes: string[]
  requireClientName: boolean
  requireClientEmail: boolean
  passwordHash: string | null
  storageProvider: string
  storageFolderId: string | null
  storageFolderPath: string | null
}

/**
 * Get portal from cache or database
 */
export async function getPortalWithCache(
  portalId: string
): Promise<CachedPortal | null> {
  const cacheKey = `portal:${portalId}`

  try {
    // Try to get from cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.warn("Failed to get portal from cache:", error)
    // Fall through to database query
  }

  try {
    // Get from database
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      select: {
        id: true,
        userId: true,
        name: true,
        slug: true,
        isActive: true,
        maxFileSize: true,
        allowedFileTypes: true,
        requireClientName: true,
        requireClientEmail: true,
        passwordHash: true,
        storageProvider: true,
        storageFolderId: true,
        storageFolderPath: true,
      },
    })

    if (!portal) {
      return null
    }

    // Cache the result
    try {
      await redis.setex(
        cacheKey,
        CACHE_TTL,
        JSON.stringify(portal)
      )
    } catch (error) {
      console.warn("Failed to cache portal:", error)
    }

    return portal
  } catch (error) {
    console.error("Failed to get portal:", error)
    return null
  }
}

/**
 * Invalidate portal cache
 */
export async function invalidatePortalCache(portalId: string): Promise<void> {
  try {
    await redis.del(`portal:${portalId}`)
  } catch (error) {
    console.warn("Failed to invalidate portal cache:", error)
  }
}

/**
 * Get portal with user info (for email notifications, etc.)
 */
export async function getPortalWithUser(portalId: string) {
  return prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: { user: true },
  })
}
