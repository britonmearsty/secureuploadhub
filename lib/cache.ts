import { createClient } from 'redis'

let redisClient: any = null
let isConnecting = false

async function getRedisClient(): Promise<any> {
  // If Redis is disabled or not configured, return null
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL_LOCAL
  if (!redisUrl) {
    return null
  }

  // If client exists and is connected, return it
  if (redisClient && redisClient.isReady) {
    return redisClient
  }

  // If already connecting, wait for it
  if (isConnecting) {
    let attempts = 0
    while (isConnecting && attempts < 50) { // Wait up to 5 seconds
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    return redisClient && redisClient.isReady ? redisClient : null
  }

  // Create new connection
  isConnecting = true
  
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
      },
    })

    redisClient.on('error', (err: any) => {
      console.error('Redis connection error:', err)
      redisClient = null
      isConnecting = false
    })

    redisClient.on('connect', () => {
      console.log('Connected to Redis')
    })

    redisClient.on('disconnect', () => {
      console.log('Disconnected from Redis')
      redisClient = null
      isConnecting = false
    })

    redisClient.on('end', () => {
      console.log('Redis connection ended')
      redisClient = null
      isConnecting = false
    })

    // Actually connect to Redis with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ])

    isConnecting = false
    return redisClient
  } catch (error) {
    console.error('Failed to create/connect Redis client:', error)
    redisClient = null
    isConnecting = false
    return null
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      redisClient = null
      console.log('Redis connection closed')
    } catch (error) {
      console.error('Error closing Redis connection:', error)
    }
  }
}

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  try {
    const redis = await getRedisClient()
    if (!redis) {
      console.log('Redis not available, falling back to direct fetch')
      return await fetcher()
    }

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
    const redis = await getRedisClient()
    if (!redis) {
      console.log('Redis not available, skipping cache invalidation')
      return
    }

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
    const redis = await getRedisClient()
    if (!redis) {
      console.log('Redis not available, skipping cache set')
      return
    }
    await redis.setEx(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function getCacheData<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient()
    if (!redis) {
      console.log('Redis not available, returning null')
      return null
    }
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