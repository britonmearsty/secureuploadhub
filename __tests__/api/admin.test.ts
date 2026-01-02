import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    uploadPortal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    fileUpload: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    account: {
      deleteMany: vi.fn(),
    },
    chunkedUpload: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/audit-log', () => ({
  AUDIT_ACTIONS: {
    USER_DELETED: 'USER_DELETED',
    USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    BULK_USER_ACTION: 'BULK_USER_ACTION',
    PORTAL_DELETED: 'PORTAL_DELETED',
  },
  logAuditAction: vi.fn(),
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { logAuditAction, AUDIT_ACTIONS } from '@/lib/audit-log'

describe('API Route: /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/admin/users', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      const { GET } = await import('@/app/api/admin/users/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when user is not admin', async () => {
      const mockSession = { user: { id: 'user-1', role: 'user' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      const { GET } = await import('@/app/api/admin/users/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return paginated users with default parameters', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'user',
          status: 'active',
          createdAt: new Date(),
          _count: {
            uploadPortals: 2,
            uploads: 10,
          },
          subscriptions: [],
          lastLoginAt: new Date(),
        },
      ]
      const mockTotalCount = 1

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
      vi.mocked(prisma.user.count).mockResolvedValue(mockTotalCount)

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      const { GET } = await import('@/app/api/admin/users/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toEqual(mockUsers)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      })
    })

    it('should handle search parameters', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/admin/users?search=john&role=user&status=active&page=2&limit=10')
      const { GET } = await import('@/app/api/admin/users/route')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
          ],
          role: 'user',
          status: 'active',
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page 2 - 1) * limit 10
        take: 10,
      })
    })

    it('should handle database errors', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      const { GET } = await import('@/app/api/admin/users/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})

describe('API Route: /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/users/[id]', () => {
    it('should return user details', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User 1',
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        _count: {
          uploadPortals: 2,
          uploads: 10,
        },
        subscriptions: [
          {
            id: 'sub-1',
            status: 'active',
            plan: { name: 'Basic' },
          },
        ],
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      const { GET } = await import('@/app/api/admin/users/[id]/route')
      const response = await GET(
        new NextRequest('http://localhost:3000/api/admin/users/user-1'),
        { params: { id: 'user-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUser)
    })

    it('should return 404 when user not found', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/users/[id]/route')
      const response = await GET(
        new NextRequest('http://localhost:3000/api/admin/users/nonexistent'),
        { params: { id: 'nonexistent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('DELETE /api/admin/users/[id]', () => {
    it('should return 400 when trying to delete self', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const { DELETE } = await import('@/app/api/admin/users/[id]/route')
      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/admin/users/admin-1', { method: 'DELETE' }),
        { params: { id: 'admin-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete your own account')
    })

    it('should delete user with cascading deletes', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User 1',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      const { DELETE } = await import('@/app/api/admin/users/[id]/route')
      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/admin/users/user-1', { method: 'DELETE' }),
        { params: { id: 'user-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('User deleted successfully')
      expect(logAuditAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTIONS.USER_DELETED,
        'User',
        'user-1',
        { deletedUser: mockUser }
      )
    })

    it('should return 404 when user not found', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/admin/users/[id]/route')
      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/admin/users/nonexistent', { method: 'DELETE' }),
        { params: { id: 'nonexistent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })
})

describe('API Route: /api/admin/users/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/users/[id]/status', () => {
    it('should return 400 when trying to disable self', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/admin-1/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'disabled' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/status/route')
      const response = await POST(request, { params: { id: 'admin-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot disable your own account')
    })

    it('should update user status successfully', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        status: 'active',
      }
      const mockUpdatedUser = {
        ...mockUser,
        status: 'disabled',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'disabled' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/status/route')
      const response = await POST(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUpdatedUser)
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(logAuditAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTIONS.USER_STATUS_CHANGED,
        'User',
        'user-1',
        { oldStatus: 'active', newStatus: 'disabled' }
      )
    })

    it('should return 400 for invalid status', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'invalid' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/status/route')
      const response = await POST(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status. Must be "active" or "disabled"')
    })
  })
})

describe('API Route: /api/admin/users/[id]/role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/users/[id]/role', () => {
    it('should return 400 when trying to demote self', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/admin-1/role', {
        method: 'POST',
        body: JSON.stringify({ role: 'user' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/role/route')
      const response = await POST(request, { params: { id: 'admin-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot change your own role')
    })

    it('should update user role successfully', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      }
      const mockUpdatedUser = {
        ...mockUser,
        role: 'admin',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1/role', {
        method: 'POST',
        body: JSON.stringify({ role: 'admin' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/role/route')
      const response = await POST(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUpdatedUser)
      expect(logAuditAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTIONS.USER_ROLE_CHANGED,
        'User',
        'user-1',
        { oldRole: 'user', newRole: 'admin' }
      )
    })

    it('should return 400 for invalid role', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1/role', {
        method: 'POST',
        body: JSON.stringify({ role: 'invalid' }),
      })

      const { POST } = await import('@/app/api/admin/users/[id]/role/route')
      const response = await POST(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role. Must be "user" or "admin"')
    })
  })
})

describe('API Route: /api/admin/users/bulk-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/users/bulk-actions', () => {
    it('should return 400 when userIds array is empty', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ action: 'changeStatus', userIds: [], value: 'disabled' }),
      })

      const { POST } = await import('@/app/api/admin/users/bulk-actions/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No users selected')
    })

    it('should return 400 when trying to include self in bulk action', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'changeStatus', 
          userIds: ['admin-1', 'user-1'], 
          value: 'disabled' 
        }),
      })

      const { POST } = await import('@/app/api/admin/users/bulk-actions/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot perform bulk actions on your own account')
    })

    it('should perform bulk status change successfully', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'changeStatus', 
          userIds: ['user-1', 'user-2'], 
          value: 'disabled' 
        }),
      })

      const { POST } = await import('@/app/api/admin/users/bulk-actions/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.affectedCount).toBe(2)
      expect(data.message).toBe('Status updated for 2 users')
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { status: 'disabled' },
      })
      expect(logAuditAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTIONS.BULK_USER_ACTION,
        'User',
        null,
        { action: 'changeStatus', userIds: ['user-1', 'user-2'], value: 'disabled', affectedCount: 2 }
      )
    })

    it('should perform bulk delete successfully', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma)
      })
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'delete', 
          userIds: ['user-1', 'user-2']
        }),
      })

      const { POST } = await import('@/app/api/admin/users/bulk-actions/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.affectedCount).toBe(2)
      expect(data.message).toBe('2 users deleted')
    })

    it('should return 400 for invalid action', async () => {
      const mockSession = { user: { id: 'admin-1', role: 'admin' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'invalid', 
          userIds: ['user-1']
        }),
      })

      const { POST } = await import('@/app/api/admin/users/bulk-actions/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })
  })
})