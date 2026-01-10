/**
 * Caching utilities using in-memory storage
 * Fallback implementation when Redis is not available
 */

import redis from './redis'

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  try {
    console.log(`Cache lookup for key: ${key}`)
    const cached = await redis.get(key)

    if (cached) {
      console.log(`Cache hit for key: ${key}`)
      return JSON.parse(cached)
    }

    console.log(`Cache miss for key: ${key}`)
    const data = await fetcher()
    await redis.setex(key, ttl, JSON.stringify(data))
    return data
  } catch (error) {
    console.error('Cache error, falling back to direct fetch:', error)
    return await fetcher()
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Note: In-memory implementation doesn't support pattern matching
    // This is a simplified version - patterns would need custom implementation
    console.log(`Cache invalidation requested for pattern: ${pattern} (in-memory cache will expire naturally)`)
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

export async function setCacheData(key: string, data: any, ttl: number = 300): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function getCacheData<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

// Graceful shutdown (no-op for in-memory)
export async function closeRedisConnection(): Promise<void> {
  console.log('In-memory cache cleanup (no Redis connection to close)')
}

// User-specific cache key generators
export function getUserDashboardKey(userId: string): string {
  return `dashboard:${userId}`
}

export function getUserPortalsKey(userId: string): string {
  return `portals:${userId}`
}

export function getUserUploadsKey(userId: string, limit?: number): string {
  return `uploads:${userId}:${limit || 50}`
}

export function getUserStatsKey(userId: string): string {
  return `stats:${userId}`
}