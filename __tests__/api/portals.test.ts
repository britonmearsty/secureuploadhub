import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/portals/route'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  invalidateCache: vi.fn(),
  getUserDashboardKey: vi.fn(),
  getUserPortalsKey: vi.fn(),
  getUserUploadsKey: vi.fn(),
  getUserStatsKey: vi.fn(),
}))

vi.mock('@/lib/billing', () => ({
  assertPortalLimit: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  validateStorageConnection: vi.fn(),
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { invalidateCache } from '@/lib/cache'
import { assertPortalLimit } from '@/lib/billing'
import { validateStorageConnection } from '@/lib/storage'

describe('API Route: /api/portals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/portals', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when user session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user portals with upload counts', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockPortals = [
        {
          id: 'portal-1',
          name: 'Test Portal',
          slug: 'test-portal',
          userId: 'user-1',
          createdAt: new Date(),
          _count: { uploads: 5 },
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.uploadPortal.findMany).mockResolvedValue(mockPortals as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockPortals)
      expect(prisma.uploadPortal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          _count: {
            select: { uploads: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle database errors', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.uploadPortal.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/portals', () => {
    const validPortalData = {
      name: 'Test Portal',
      slug: 'test-portal',
      description: 'Test description',
      primaryColor: '#000000',
      logoUrl: 'https://example.com/logo.png',
      requireClientName: true,
      requireClientEmail: true,
      storageProvider: 'google',
      storageConfig: { folderId: 'folder-123' },
    }

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required fields', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // Missing required fields
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should check portal limits', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockRejectedValue(new Error('Portal limit exceeded'))

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Portal limit exceeded')
    })

    it('should validate slug uniqueness', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.count).mockResolvedValue(1) // Slug exists

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Slug already exists')
    })

    it('should validate storage connection', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.count).mockResolvedValue(0)
      vi.mocked(validateStorageConnection).mockRejectedValue(new Error('Invalid storage config'))

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid storage config')
    })

    it('should create portal successfully', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockCreatedPortal = { id: 'portal-1', ...validPortalData, userId: 'user-1' }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.count).mockResolvedValue(0)
      vi.mocked(validateStorageConnection).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.create).mockResolvedValue(mockCreatedPortal as any)

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedPortal)
      expect(invalidateCache).toHaveBeenCalledTimes(4) // Should invalidate 4 cache keys
    })

    it('should hash password when provided', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const portalDataWithPassword = { ...validPortalData, password: 'secret123' }
      const mockCreatedPortal = { id: 'portal-1', ...validPortalData, userId: 'user-1' }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.count).mockResolvedValue(0)
      vi.mocked(validateStorageConnection).mockResolvedValue(undefined)
      vi.mocked(hashPassword).mockResolvedValue('hashed-password')
      vi.mocked(prisma.uploadPortal.create).mockResolvedValue(mockCreatedPortal as any)

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(portalDataWithPassword),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(hashPassword).toHaveBeenCalledWith('secret123')
      expect(prisma.uploadPortal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'hashed-password',
          }),
        })
      )
    })

    it('should handle database errors during creation', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(assertPortalLimit).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.count).mockResolvedValue(0)
      vi.mocked(validateStorageConnection).mockResolvedValue(undefined)
      vi.mocked(prisma.uploadPortal.create).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/portals', {
        method: 'POST',
        body: JSON.stringify(validPortalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})