import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPortalWithCache, invalidatePortalCache } from '@/lib/portal-cache'
import * as redis from '@/lib/redis'
import * as prisma from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/redis')
vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findUnique: vi.fn(),
    },
  },
}))

describe('portal-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPortalWithCache', () => {
    const mockPortal = {
      id: 'portal-123',
      userId: 'user-123',
      name: 'Test Portal',
      slug: 'test-portal',
      isActive: true,
      maxFileSize: 104857600,
      allowedFileTypes: ['image/*', 'application/pdf'],
      requireClientName: true,
      requireClientEmail: false,
      passwordHash: null,
      storageProvider: 'google_drive',
      storageFolderId: 'folder-123',
      storageFolderPath: '/uploads',
    }

    it('should return cached portal', async () => {
      const mockRedis = redis as any
      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(mockPortal))

      const result = await getPortalWithCache('portal-123')

      expect(result).toEqual(mockPortal)
      expect(mockRedis.get).toHaveBeenCalledWith('portal:portal-123')
    })

    it('should fetch from database if not in cache', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      const result = await getPortalWithCache('portal-123')

      expect(result).toEqual(mockPortal)
      expect(mockPrisma.default.uploadPortal.findUnique).toHaveBeenCalledWith({
        where: { id: 'portal-123' },
        select: expect.any(Object),
      })
    })

    it('should cache portal after database fetch', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      await getPortalWithCache('portal-123')

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'portal:portal-123',
        3600,
        JSON.stringify(mockPortal)
      )
    })

    it('should return null if portal not found', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(null)

      const result = await getPortalWithCache('non-existent')

      expect(result).toBeNull()
    })

    it('should handle Redis errors gracefully', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockRejectedValue(new Error('Redis error'))
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      const result = await getPortalWithCache('portal-123')

      expect(result).toEqual(mockPortal)
      // Should fall back to database query
      expect(mockPrisma.default.uploadPortal.findUnique).toHaveBeenCalled()
    })

    it('should handle cache write errors gracefully', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.setex = vi
        .fn()
        .mockRejectedValue(new Error('Cache write failed'))
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      const result = await getPortalWithCache('portal-123')

      // Should still return the portal even if caching fails
      expect(result).toEqual(mockPortal)
    })

    it('should select only necessary fields from database', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      await getPortalWithCache('portal-123')

      const callArgs = mockPrisma.default.uploadPortal.findUnique.mock.calls[0][0]
      expect(callArgs.select).toBeDefined()
      expect(callArgs.select.id).toBe(true)
      expect(callArgs.select.userId).toBe(true)
      expect(callArgs.select.name).toBe(true)
    })
  })

  describe('invalidatePortalCache', () => {
    it('should delete portal from cache', async () => {
      const mockRedis = redis as any
      mockRedis.del = vi.fn().mockResolvedValue(1)

      await invalidatePortalCache('portal-123')

      expect(mockRedis.del).toHaveBeenCalledWith('portal:portal-123')
    })

    it('should handle deletion errors gracefully', async () => {
      const mockRedis = redis as any
      mockRedis.del = vi.fn().mockRejectedValue(new Error('Delete failed'))

      // Should not throw
      await expect(invalidatePortalCache('portal-123')).resolves.toBeUndefined()
    })

    it('should work with multiple portals', async () => {
      const mockRedis = redis as any
      mockRedis.del = vi.fn().mockResolvedValue(1)

      await invalidatePortalCache('portal-1')
      await invalidatePortalCache('portal-2')

      expect(mockRedis.del).toHaveBeenCalledTimes(2)
      expect(mockRedis.del).toHaveBeenCalledWith('portal:portal-1')
      expect(mockRedis.del).toHaveBeenCalledWith('portal:portal-2')
    })
  })

  describe('cache performance', () => {
    it('should reduce database queries', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any
      const mockPortal = { id: 'p-1', name: 'Portal 1' }

      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(null) // First call - miss
        .mockResolvedValueOnce(JSON.stringify(mockPortal)) // Second call - hit
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      // First call - database query
      await getPortalWithCache('p-1')
      expect(mockPrisma.default.uploadPortal.findUnique).toHaveBeenCalledTimes(1)

      // Second call - cache hit
      await getPortalWithCache('p-1')
      expect(mockPrisma.default.uploadPortal.findUnique).toHaveBeenCalledTimes(1)

      // Database should only be called once
    })

    it('should set correct TTL', async () => {
      const mockRedis = redis as any
      const mockPrisma = prisma as any
      const mockPortal = { id: 'p-1' }

      mockRedis.get = vi.fn().mockResolvedValue(null)
      mockRedis.setex = vi.fn().mockResolvedValue('OK')
      mockPrisma.default.uploadPortal.findUnique.mockResolvedValue(mockPortal)

      await getPortalWithCache('p-1')

      const [key, ttl] = mockRedis.setex.mock.calls[0]
      expect(ttl).toBe(3600) // 1 hour
    })
  })
})
