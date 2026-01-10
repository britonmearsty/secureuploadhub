/**
 * In-Memory Redis Replacement
 * Simple in-memory storage for single-instance deployments
 */

interface CacheEntry {
  value: string
  expiresAt: number
}

class InMemoryRedis {
  private cache = new Map<string, CacheEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    const expiresAt = Date.now() + (ttl * 1000)
    this.cache.set(key, { value, expiresAt })
    return 'OK'
  }

  async del(key: string): Promise<number> {
    const existed = this.cache.has(key)
    this.cache.delete(key)
    return existed ? 1 : 0
  }

  // Additional methods for compatibility
  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    if (mode === 'EX' && duration) {
      return this.setex(key, duration, value)
    }
    // Default to 1 hour TTL if no expiration specified
    return this.setex(key, 3600, value)
  }

  async setEx(key: string, ttl: number, value: string): Promise<string> {
    return this.setex(key, ttl, value)
  }

  // Cleanup on process exit
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

// Create singleton instance
const inMemoryRedis = new InMemoryRedis()

// Cleanup on process exit
process.on('exit', () => inMemoryRedis.destroy())
process.on('SIGINT', () => inMemoryRedis.destroy())
process.on('SIGTERM', () => inMemoryRedis.destroy())

export const redis = inMemoryRedis
export default redis
