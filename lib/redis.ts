let client: any = null

// Lazy initialization - only create client when actually needed
function getClient() {
  if (!client && process.env.NODE_ENV !== 'test') {
    const { createClient } = require('redis')
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })
    client.on('error', (err: any) => console.error('Redis Client Error', err))
    client.connect().catch(console.error)
  }
  return client
}

export const redis = {
  get: async (key: string) => {
    const c = getClient()
    if (!c) return null
    try {
      return await c.get(key)
    } catch (error) {
      console.error('Redis get error:', error)
      throw error
    }
  },
  setex: async (key: string, ttl: number, value: string) => {
    const c = getClient()
    if (!c) return null
    try {
      return await c.setEx(key, ttl, value)
    } catch (error) {
      console.error('Redis setex error:', error)
      throw error
    }
  },
  del: async (key: string) => {
    const c = getClient()
    if (!c) return null
    try {
      return await c.del(key)
    } catch (error) {
      console.error('Redis del error:', error)
      throw error
    }
  },
}

export default redis
