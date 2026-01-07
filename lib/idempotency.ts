/**
 * Idempotency System
 * Prevents duplicate operations using idempotency keys
 */

import { Redis } from 'ioredis'
import { createHash } from 'crypto'

// Redis client for idempotency tracking
let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    
    if (!redisUrl) {
      console.warn('⚠️ IDEMPOTENCY: No Redis URL found, using in-memory tracking (not suitable for production)')
      throw new Error('Redis URL required for idempotency tracking')
    }

    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
  }

  return redis
}

/**
 * Generate idempotency key from operation parameters
 */
export function generateIdempotencyKey(
  operation: string,
  parameters: Record<string, any>
): string {
  // Sort parameters for consistent hashing
  const sortedParams = Object.keys(parameters)
    .sort()
    .reduce((obj, key) => {
      obj[key] = parameters[key]
      return obj
    }, {} as Record<string, any>)

  const paramString = JSON.stringify(sortedParams)
  const hash = createHash('sha256').update(`${operation}:${paramString}`).digest('hex')
  
  return `idempotency:${operation}:${hash.substring(0, 16)}`
}

/**
 * Idempotency result
 */
export interface IdempotencyResult<T> {
  isNew: boolean
  result: T
  fromCache: boolean
}

/**
 * Execute operation with idempotency protection
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  options: {
    ttlSeconds?: number
    skipCache?: boolean
  } = {}
): Promise<IdempotencyResult<T>> {
  const { ttlSeconds = 3600, skipCache = false } = options // 1 hour default TTL

  try {
    const redis = getRedisClient()
    
    // Check if operation already completed
    if (!skipCache) {
      const cachedResult = await redis.get(idempotencyKey)
      if (cachedResult) {
        console.log(`♻️ IDEMPOTENCY: Found cached result for ${idempotencyKey}`)
        return {
          isNew: false,
          result: JSON.parse(cachedResult),
          fromCache: true
        }
      }
    }

    // Execute operation
    console.log(`🆕 IDEMPOTENCY: Executing new operation ${idempotencyKey}`)
    const result = await operation()

    // Cache the result
    await redis.setex(
      idempotencyKey,
      ttlSeconds,
      JSON.stringify(result)
    )

    return {
      isNew: true,
      result,
      fromCache: false
    }
  } catch (error) {
    console.error(`❌ IDEMPOTENCY: Error in operation ${idempotencyKey}:`, error)
    throw error
  }
}

/**
 * In-memory fallback for development
 */
class InMemoryIdempotency {
  private static cache = new Map<string, { result: any; expiresAt: number }>()

  static get<T>(key: string): T | null {
    const now = Date.now()
    
    // Clean up expired entries
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(cacheKey)
      }
    }

    const entry = this.cache.get(key)
    return entry && entry.expiresAt > now ? entry.result : null
  }

  static set(key: string, result: any, ttlSeconds: number): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    })
  }
}

/**
 * Fallback idempotency for development
 */
export async function withInMemoryIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<IdempotencyResult<T>> {
  // Check cache
  const cachedResult = InMemoryIdempotency.get<T>(idempotencyKey)
  if (cachedResult !== null) {
    return {
      isNew: false,
      result: cachedResult,
      fromCache: true
    }
  }

  // Execute operation
  const result = await operation()
  
  // Cache result
  InMemoryIdempotency.set(idempotencyKey, result, ttlSeconds)

  return {
    isNew: true,
    result,
    fromCache: false
  }
}

/**
 * Storage Account specific idempotency helpers
 */
export class StorageAccountIdempotency {
  /**
   * Generate idempotency key for StorageAccount creation
   */
  static createKey(
    userId: string,
    provider: string,
    providerAccountId: string
  ): string {
    return generateIdempotencyKey('create-storage-account', {
      userId,
      provider,
      providerAccountId
    })
  }

  /**
   * Generate idempotency key for user storage account ensuring
   */
  static ensureUserKey(userId: string): string {
    return generateIdempotencyKey('ensure-user-storage-accounts', {
      userId
    })
  }

  /**
   * Generate idempotency key for OAuth account linking
   */
  static linkAccountKey(
    userId: string,
    provider: string,
    providerAccountId: string
  ): string {
    return generateIdempotencyKey('link-oauth-account', {
      userId,
      provider,
      providerAccountId
    })
  }
}