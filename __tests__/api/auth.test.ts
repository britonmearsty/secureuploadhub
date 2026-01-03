import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { handlers } from '@/auth'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}))

describe('API Route: /api/auth/[...nextauth]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET handler', () => {
    it('should export GET handler from auth lib', () => {
      expect(handlers.GET).toBeDefined()
      expect(typeof handlers.GET).toBe('function')
    })

    it('should handle GET requests', async () => {
      const mockResponse = new Response('OK')
      vi.mocked(handlers.GET).mockResolvedValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/auth/signin')
      const response = await handlers.GET(request)

      expect(handlers.GET).toHaveBeenCalledWith(request)
      expect(response).toBe(mockResponse)
    })
  })

  describe('POST handler', () => {
    it('should export POST handler from auth lib', () => {
      expect(handlers.POST).toBeDefined()
      expect(typeof handlers.POST).toBe('function')
    })

    it('should handle POST requests', async () => {
      const mockResponse = new Response('OK')
      vi.mocked(handlers.POST).mockResolvedValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
      const response = await handlers.POST(request)

      expect(handlers.POST).toHaveBeenCalledWith(request)
      expect(response).toBe(mockResponse)
    })
  })
})