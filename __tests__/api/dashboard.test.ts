import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/dashboard/route'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findMany: vi.fn(),
    },
    fileUpload: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/cache', () => ({
  getCachedData: vi.fn(),
  getUserDashboardKey: vi.fn(),
  invalidateCache: vi.fn(),
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCachedData, getUserDashboardKey, invalidateCache } from '@/lib/cache'

describe('API Route: /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/dashboard', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when user session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as any)

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return cached dashboard data', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockDashboardData = {
        portals: [
          {
            id: 'portal-1',
            name: 'Test Portal',
            _count: { uploads: 5 },
          },
        ],
        recentUploads: [
          {
            id: 'upload-1',
            fileName: 'test.txt',
            createdAt: new Date(),
          },
        ],
        stats: {
          totalPortals: 1,
          activePortals: 1,
          totalUploads: 5,
          recentUploads: 2,
        },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getUserDashboardKey).mockReturnValue('dashboard:user-1')
      vi.mocked(getCachedData).mockResolvedValue(mockDashboardData)

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockDashboardData)
      expect(getUserDashboardKey).toHaveBeenCalledWith('user-1')
      expect(getCachedData).toHaveBeenCalledWith(
        'dashboard:user-1',
        expect.any(Function)
      )
    })

    it('should fetch fresh data when cache is empty', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockPortals = [
        {
          id: 'portal-1',
          name: 'Test Portal',
          _count: { uploads: 5 },
        },
      ]
      const mockUploads = [
        {
          id: 'upload-1',
          fileName: 'test.txt',
          createdAt: new Date(),
          portal: {
            name: 'Test Portal',
            slug: 'test-portal',
            primaryColor: '#000000',
          },
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getUserDashboardKey).mockReturnValue('dashboard:user-1')
      
      // Mock getCachedData to call the fetch function
      vi.mocked(getCachedData).mockImplementation(async (key, fetchFn) => {
        return await fetchFn()
      })
      
      vi.mocked(prisma.uploadPortal.findMany).mockResolvedValue(mockPortals as any)
      vi.mocked(prisma.fileUpload.findMany).mockResolvedValue(mockUploads as any)

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.portals).toEqual(mockPortals)
      expect(data.recentUploads).toHaveLength(1)
      expect(data.stats).toEqual({
        totalPortals: 1,
        activePortals: 1,
        totalUploads: 5,
        recentUploads: 1,
      })
    })

    it('should calculate stats correctly', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockPortals = [
        { id: 'portal-1', name: 'Active Portal', isActive: true, _count: { uploads: 10 } },
        { id: 'portal-2', name: 'Inactive Portal', isActive: false, _count: { uploads: 5 } },
      ]
      const now = new Date()
      const recentDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      
      const mockUploads = [
        { id: 'upload-1', createdAt: recentDate, portal: { name: 'Portal 1' } },
        { id: 'upload-2', createdAt: recentDate, portal: { name: 'Portal 1' } },
        { id: 'upload-3', createdAt: oldDate, portal: { name: 'Portal 1' } },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getCachedData).mockImplementation(async (key, fetchFn) => {
        return await fetchFn()
      })
      vi.mocked(prisma.uploadPortal.findMany).mockResolvedValue(mockPortals as any)
      vi.mocked(prisma.fileUpload.findMany).mockResolvedValue(mockUploads as any)

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stats).toEqual({
        totalPortals: 2,
        activePortals: 1,
        totalUploads: 15, // 10 + 5
        recentUploads: 2, // Only uploads from last 7 days
      })
    })

    it('should handle database errors', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getCachedData).mockImplementation(async (key, fetchFn) => {
        return await fetchFn()
      })
      vi.mocked(prisma.uploadPortal.findMany).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/dashboard', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/dashboard', {
        method: 'POST',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should invalidate cache successfully', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getUserDashboardKey).mockReturnValue('dashboard:user-1')
      vi.mocked(invalidateCache).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/dashboard', {
        method: 'POST',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Cache invalidated')
      expect(invalidateCache).toHaveBeenCalledWith('dashboard:user-1')
    })

    it('should handle cache invalidation errors', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(getUserDashboardKey).mockReturnValue('dashboard:user-1')
      vi.mocked(invalidateCache).mockRejectedValue(new Error('Cache error'))

      const request = new NextRequest('http://localhost:3000/api/dashboard', {
        method: 'POST',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})