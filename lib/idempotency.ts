/**
 * Idempotency System
 * Prevents duplicate operations using idempotency keys
 * 
 * NOTE: This version uses in-memory caching as Redis is not yet implemented.
 * For production with multiple server instances, Redis should be implemented.
 */

import { createHash } from 'crypto'

/**
 * In-memory idempotency cache for single-instance deployments
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
 * Execute operation with idempotency protection using in-memory cache
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
    // Check if operation already completed
    if (!skipCache) {
      const cachedResult = InMemoryIdempotency.get<T>(idempotencyKey)
      if (cachedResult !== null) {
        console.log(`♻️ IDEMPOTENCY: Found cached result for ${idempotencyKey}`)
        return {
          isNew: false,
          result: cachedResult,
          fromCache: true
        }
      }
    }

    // Execute operation
    console.log(`🆕 IDEMPOTENCY: Executing new operation ${idempotencyKey}`)
    const result = await operation()

    // Cache the result
    InMemoryIdempotency.set(idempotencyKey, result, ttlSeconds)

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
 * Fallback idempotency for development (same as main implementation for now)
 */
export async function withInMemoryIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<IdempotencyResult<T>> {
  return withIdempotency(idempotencyKey, operation, { ttlSeconds })
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