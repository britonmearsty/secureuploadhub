import { createClient } from 'redis'

let redisClient: any = null

function getRedisClient(): any {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL_LOCAL || 'redis://localhost:6379'

    try {
      redisClient = createClient({
        url: redisUrl,
      })

      redisClient.on('error', (err: any) => {
        console.error('Redis connection error:', err)
      })

      redisClient.on('connect', () => {
        console.log('Connected to Redis')
      })
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      redisClient = null
    }
  }

  return redisClient
}

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  try {
    const redis = getRedisClient()
    const cached = await redis.get(key)

    if (cached) {
      console.log(`Cache hit for key: ${key}`)
      return JSON.parse(cached)
    }

    console.log(`Cache miss for key: ${key}`)
    const data = await fetcher()
    await redis.setEx(key, ttl, JSON.stringify(data))
    return data
  } catch (error) {
    console.error('Cache error:', error)
    // Fall back to direct fetch if caching fails
    return await fetcher()
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient()
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(keys)
      console.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`)
    }
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

export async function setCacheData(key: string, data: any, ttl: number = 300): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.setEx(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function getCacheData<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient()
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
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