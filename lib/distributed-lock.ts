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

  constructor(key: string) {
    this.lockKey = key
    this.lockValue = `${Date.now()}-${Math.random()}`
  }

  /**
   * Acquire the lock with timeout
   */
  async acquire(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      if (InMemoryLock.acquire(this.lockKey, this.lockValue, timeoutMs)) {
        return true
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return false
  }

  /**
   * Release the lock
   */
  async release(): Promise<boolean> {
    return InMemoryLock.release(this.lockKey, this.lockValue)
  }

  /**
   * Extend the lock duration
   */
  async extend(additionalMs: number): Promise<boolean> {
    return InMemoryLock.extend(this.lockKey, this.lockValue, additionalMs)
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

  const lock = new DistributedLock(lockKey)
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