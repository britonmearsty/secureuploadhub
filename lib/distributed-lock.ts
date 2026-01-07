/**
 * Distributed Locking System
 * Prevents race conditions in StorageAccount creation and other critical operations
 * 
 * NOTE: This version uses in-memory locking as Redis is not yet implemented.
 * For production with multiple server instances, Redis should be implemented.
 */

// In-memory locking for single-instance deployments
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

  static extend(key: string, value: string, additionalMs: number): boolean {
    const lock = this.locks.get(key)
    if (lock && lock.value === value) {
      lock.expiresAt = Date.now() + additionalMs
      return true
    }
    return false
  }
}

/**
 * Distributed lock implementation using in-memory storage
 * TODO: Replace with Redis implementation for production multi-instance deployments
 */
export class DistributedLock {
  private lockKey: string
  private lockValue: string
  private ttlMs: number
  private acquired: boolean = false

  constructor(lockKey: string, ttlMs: number = 30000) {
    this.lockKey = `lock:${lockKey}`
    this.lockValue = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    this.ttlMs = ttlMs
  }

  /**
   * Acquire the distributed lock
   */
  async acquire(): Promise<boolean> {
    try {
      this.acquired = InMemoryLock.acquire(this.lockKey, this.lockValue, this.ttlMs)
      
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
      const released = InMemoryLock.release(this.lockKey, this.lockValue)
      
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
      const extended = InMemoryLock.extend(this.lockKey, this.lockValue, additionalMs)
      
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
 * Fallback distributed lock for development (same as main implementation for now)
 */
export async function withInMemoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttlMs: number = 30000
): Promise<T> {
  return withDistributedLock(lockKey, fn, { ttlMs, retryAttempts: 1 })
}