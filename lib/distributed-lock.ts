/**
 * Distributed Locking System
 * Prevents race conditions in StorageAccount creation and other critical operations
 */

import { Redis } from 'ioredis'

// Redis client for distributed locking
let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    
    if (!redisUrl) {
      // Fallback to in-memory locking for development
      console.warn('⚠️ DISTRIBUTED_LOCK: No Redis URL found, using in-memory locks (not suitable for production)')
      throw new Error('Redis URL required for distributed locking')
    }

    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    redis.on('error', (error) => {
      console.error('❌ DISTRIBUTED_LOCK: Redis connection error:', error)
    })

    redis.on('connect', () => {
      console.log('✅ DISTRIBUTED_LOCK: Redis connected')
    })
  }

  return redis
}

/**
 * Distributed lock implementation using Redis
 */
export class DistributedLock {
  private redis: Redis
  private lockKey: string
  private lockValue: string
  private ttlMs: number
  private acquired: boolean = false

  constructor(lockKey: string, ttlMs: number = 30000) {
    this.redis = getRedisClient()
    this.lockKey = `lock:${lockKey}`
    this.lockValue = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    this.ttlMs = ttlMs
  }

  /**
   * Acquire the distributed lock
   */
  async acquire(): Promise<boolean> {
    try {
      // Use SET with NX (only if not exists) and PX (expire in milliseconds)
      const result = await this.redis.set(
        this.lockKey,
        this.lockValue,
        'PX',
        this.ttlMs,
        'NX'
      )

      this.acquired = result === 'OK'
      
      if (this.acquired) {
        console.log(`🔒 DISTRIBUTED_LOCK: Acquired lock ${this.lockKey}`)
      } else {
        console.log(`⏳ DISTRIBUTED_LOCK: Failed to acquire lock ${this.lockKey} (already held)`)
      }

      return this.acquired
    } catch (error) {
      console.error(`❌ DISTRIBUTED_LOCK: Error acquiring lock ${this.lockKey}:`, error)
      return false
    }
  }

  /**
   * Release the distributed lock
   */
  async release(): Promise<boolean> {
    if (!this.acquired) {
      return true
    }

    try {
      // Use Lua script to ensure we only delete our own lock
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `

      const result = await this.redis.eval(
        luaScript,
        1,
        this.lockKey,
        this.lockValue
      ) as number

      const released = result === 1
      
      if (released) {
        console.log(`🔓 DISTRIBUTED_LOCK: Released lock ${this.lockKey}`)
        this.acquired = false
      } else {
        console.warn(`⚠️ DISTRIBUTED_LOCK: Failed to release lock ${this.lockKey} (not our lock or expired)`)
      }

      return released
    } catch (error) {
      console.error(`❌ DISTRIBUTED_LOCK: Error releasing lock ${this.lockKey}:`, error)
      return false
    }
  }

  /**
   * Extend the lock TTL
   */
  async extend(additionalMs: number = 30000): Promise<boolean> {
    if (!this.acquired) {
      return false
    }

    try {
      // Use Lua script to extend TTL only if we own the lock
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `

      const result = await this.redis.eval(
        luaScript,
        1,
        this.lockKey,
        this.lockValue,
        additionalMs.toString()
      ) as number

      const extended = result === 1
      
      if (extended) {
        console.log(`⏰ DISTRIBUTED_LOCK: Extended lock ${this.lockKey} by ${additionalMs}ms`)
      }

      return extended
    } catch (error) {
      console.error(`❌ DISTRIBUTED_LOCK: Error extending lock ${this.lockKey}:`, error)
      return false
    }
  }
}

/**
 * Execute a function with distributed locking
 */
export async function withDistributedLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  options: {
    ttlMs?: number
    retryAttempts?: number
    retryDelayMs?: number
  } = {}
): Promise<T> {
  const {
    ttlMs = 30000,
    retryAttempts = 3,
    retryDelayMs = 1000
  } = options

  const lock = new DistributedLock(lockKey, ttlMs)
  let attempt = 0

  while (attempt < retryAttempts) {
    const acquired = await lock.acquire()
    
    if (acquired) {
      try {
        const result = await fn()
        return result
      } finally {
        await lock.release()
      }
    }

    attempt++
    if (attempt < retryAttempts) {
      console.log(`🔄 DISTRIBUTED_LOCK: Retry attempt ${attempt} for lock ${lockKey} in ${retryDelayMs}ms`)
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
    }
  }

  throw new Error(`Failed to acquire distributed lock '${lockKey}' after ${retryAttempts} attempts`)
}

/**
 * In-memory fallback for development/testing
 */
class InMemoryLock {
  private static locks = new Map<string, { value: string; expiresAt: number }>()
  
  static acquire(key: string, value: string, ttlMs: number): boolean {
    const now = Date.now()
    
    // Clean up expired locks
    for (const [lockKey, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(lockKey)
      }
    }

    // Try to acquire lock
    if (!this.locks.has(key)) {
      this.locks.set(key, {
        value,
        expiresAt: now + ttlMs
      })
      return true
    }

    return false
  }

  static release(key: string, value: string): boolean {
    const lock = this.locks.get(key)
    if (lock && lock.value === value) {
      this.locks.delete(key)
      return true
    }
    return false
  }
}

/**
 * Fallback distributed lock for development
 */
export async function withInMemoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttlMs: number = 30000
): Promise<T> {
  const lockValue = `${Date.now()}-${Math.random().toString(36).substring(2)}`
  const fullKey = `lock:${lockKey}`
  
  const acquired = InMemoryLock.acquire(fullKey, lockValue, ttlMs)
  
  if (!acquired) {
    throw new Error(`Failed to acquire in-memory lock '${lockKey}'`)
  }

  try {
    return await fn()
  } finally {
    InMemoryLock.release(fullKey, lockValue)
  }
}