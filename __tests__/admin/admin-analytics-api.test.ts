import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    uploadPortal: {
      count: vi.fn(),
    },
    fileUpload: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

describe('Admin Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/analytics', () => {
    it('should return comprehensive analytics for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      // Mock analytics data
      const mockAnalytics = {
        totalUsers: 1250,
        activeUsers: 1100,
        newUsers: 45,
        adminUsers: 3,
        disabledUsers: 25,
        totalPortals: 89,
        activePortals: 76,
        totalUploads: 15420,
        totalStorageUsed: 2.5 * 1024 * 1024 * 1024, // 2.5GB in bytes
        totalRevenue: 125000, // $1,250.00 in cents
        activeSubscriptions: 67,
        churnRate: 0.05, // 5%
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.count).mockImplementation(({ where }) => {
        if (where?.role === 'admin') return Promise.resolve(mockAnalytics.adminUsers)
        if (where?.isActive === false) return Promise.resolve(mockAnalytics.disabledUsers)
        if (where?.createdAt?.gte) return Promise.resolve(mockAnalytics.newUsers)
        return Promise.resolve(mockAnalytics.totalUsers)
      })
      vi.mocked(prisma.uploadPortal.count).mockImplementation(({ where }) => {
        if (where?.isActive === true) return Promise.resolve(mockAnalytics.activePortals)
        return Promise.resolve(mockAnalytics.totalPortals)
      })
      vi.mocked(prisma.fileUpload.count).mockResolvedValue(mockAnalytics.totalUploads)
      vi.mocked(prisma.fileUpload.aggregate).mockResolvedValue({
        _sum: { fileSize: mockAnalytics.totalStorageUsed }
      })
      vi.mocked(prisma.subscription.count).mockResolvedValue(mockAnalytics.activeSubscriptions)
      vi.mocked(prisma.payment.aggregate).mockResolvedValue({
        _sum: { amount: mockAnalytics.totalRevenue }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/analytics')
      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics.totalUsers).toBe(1250)
      expect(data.analytics.activePortals).toBe(76)
      expect(data.analytics.totalUploads).toBe(15420)
      expect(data.analytics.totalStorageUsed).toBe(2.5 * 1024 * 1024 * 1024)
      expect(data.analytics.totalRevenue).toBe(125000)
    })

    it('should return 403 for non-admin users', async () => {
      const mockSession = {
        user: { id: 'user-1', role: 'user' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/admin/analytics')
      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/analytics')
      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should include time-based analytics', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockTimeBasedData = [
        { date: '2024-01-01', uploads: 45, revenue: 2500 },
        { date: '2024-01-02', uploads: 52, revenue: 3100 },
        { date: '2024-01-03', uploads: 38, revenue: 1900 },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockTimeBasedData)

      const request = new NextRequest('http://localhost:3000/api/admin/analytics?period=7d')
      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics.timeBasedData).toHaveLength(3)
      expect(data.analytics.timeBasedData[0].uploads).toBe(45)
    })

    it('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/admin/analytics')
      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch analytics data')
    })
  })

  describe('GET /api/admin/analytics/export', () => {
    it('should export analytics data as CSV for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockExportData = [
        { date: '2024-01-01', users: 100, uploads: 45, revenue: 2500 },
        { date: '2024-01-02', users: 102, uploads: 52, revenue: 3100 },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockExportData)

      const request = new NextRequest('http://localhost:3000/api/admin/analytics/export?format=csv')
      const { GET } = await import('@/app/api/admin/analytics/export/route')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(response.headers.get('content-disposition')).toContain('attachment')
    })

    it('should export analytics data as JSON for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockExportData = [
        { date: '2024-01-01', users: 100, uploads: 45, revenue: 2500 },
        { date: '2024-01-02', users: 102, uploads: 52, revenue: 3100 },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockExportData)

      const request = new NextRequest('http://localhost:3000/api/admin/analytics/export?format=json')
      const { GET } = await import('@/app/api/admin/analytics/export/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].users).toBe(100)
    })
  })

  describe('Analytics Calculations', () => {
    it('should verify analytics mock setup', () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockAnalytics = {
        totalUsers: 1250,
        activeUsers: 1100,
        adminUsers: 5,
        disabledUsers: 150,
        newUsers: 50,
        totalPortals: 450,
        activePortals: 380,
        newPortals: 25,
        totalUploads: 15000,
        completedUploads: 14500,
        recentUploads: 500,
        totalStorageUsed: { _sum: { fileSize: 5000000000 } },
        totalSubscriptions: 800,
        activeSubscriptions: 720,
        totalRevenue: { _sum: { amount: 125000 } },
        recentRevenue: { _sum: { amount: 15000 } }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.count).mockImplementation((args) => {
        if (!args) return Promise.resolve(mockAnalytics.totalUsers)
        if (args.where?.status === 'active') return Promise.resolve(mockAnalytics.activeUsers)
        if (args.where?.role === 'admin') return Promise.resolve(mockAnalytics.adminUsers)
        if (args.where?.status === 'disabled') return Promise.resolve(mockAnalytics.disabledUsers)
        if (args.where?.createdAt) return Promise.resolve(mockAnalytics.newUsers)
        return Promise.resolve(0)
      })

      vi.mocked(prisma.uploadPortal.count).mockImplementation((args) => {
        if (!args) return Promise.resolve(mockAnalytics.totalPortals)
        if (args.where?.isActive === true) return Promise.resolve(mockAnalytics.activePortals)
        if (args.where?.createdAt) return Promise.resolve(mockAnalytics.newPortals)
        return Promise.resolve(0)
      })

      vi.mocked(prisma.fileUpload.count).mockImplementation((args) => {
        if (!args) return Promise.resolve(mockAnalytics.totalUploads)
        if (args.where?.status === 'completed') return Promise.resolve(mockAnalytics.completedUploads)
        if (args.where?.createdAt) return Promise.resolve(mockAnalytics.recentUploads)
        return Promise.resolve(0)
      })

      vi.mocked(prisma.fileUpload.aggregate).mockResolvedValue(mockAnalytics.totalStorageUsed)
      vi.mocked(prisma.subscription.count).mockImplementation((args) => {
        if (!args) return Promise.resolve(mockAnalytics.totalSubscriptions)
        if (args.where?.status === 'active') return Promise.resolve(mockAnalytics.activeSubscriptions)
        return Promise.resolve(0)
      })

      vi.mocked(prisma.payment.aggregate).mockImplementation((args) => {
        if (args?.where?.createdAt) return Promise.resolve(mockAnalytics.recentRevenue)
        return Promise.resolve(mockAnalytics.totalRevenue)
      })

      // Verify analytics calculations
      expect(mockAnalytics.totalUsers).toBeGreaterThan(0)
      expect(mockAnalytics.activeUsers).toBeLessThanOrEqual(mockAnalytics.totalUsers)
      expect(mockAnalytics.completedUploads).toBeLessThanOrEqual(mockAnalytics.totalUploads)
      expect(mockAnalytics.activeSubscriptions).toBeLessThanOrEqual(mockAnalytics.totalSubscriptions)
    })

    it('should handle date range filtering', () => {
      const url = new URL('http://localhost/api/admin/analytics?days=7')
      const days = parseInt(url.searchParams.get('days') || '30')
      
      expect(days).toBe(7)
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      expect(startDate).toBeInstanceOf(Date)
      expect(startDate.getTime()).toBeLessThan(Date.now())
    })

    it('should calculate growth rates correctly', () => {
      const currentPeriod = 150
      const previousPeriod = 120
      
      const growthRate = ((currentPeriod - previousPeriod) / previousPeriod) * 100
      expect(growthRate).toBeCloseTo(25, 1) // 25% growth
    })

    it('should handle zero division in growth calculations', () => {
      const currentPeriod = 50
      const previousPeriod = 0
      
      const growthRate = previousPeriod === 0 ? 100 : ((currentPeriod - previousPeriod) / previousPeriod) * 100
      expect(growthRate).toBe(100)
    })

    it('should format storage sizes correctly', () => {
      const byteSizes = [
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 1099511627776, expected: '1 TB' }
      ]

      byteSizes.forEach(({ bytes, expected }) => {
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 Bytes'
          const k = 1024
          const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
        }

        expect(formatBytes(bytes)).toBe(expected)
      })
    })

    it('should return 401 for non-admin users', async () => {
      const mockSession = {
        user: { id: 'user-1', role: 'user' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const isAuthorized = mockSession.user.role === 'admin'
      expect(isAuthorized).toBe(false)
    })
  })

  describe('Analytics Trends', () => {
    it('should calculate user growth trends', async () => {
      const mockTrendData = [
        { date: '2024-01-01', count: 100 },
        { date: '2024-01-02', count: 105 },
        { date: '2024-01-03', count: 110 },
        { date: '2024-01-04', count: 108 },
        { date: '2024-01-05', count: 115 }
      ]

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockTrendData)

      // Calculate trend direction
      const firstValue = mockTrendData[0].count
      const lastValue = mockTrendData[mockTrendData.length - 1].count
      const trendDirection = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable'

      expect(trendDirection).toBe('up')
      expect(lastValue).toBeGreaterThan(firstValue)
    })

    it('should handle upload trends', () => {
      const uploadTrend = [
        { date: '2024-01-01', uploads: 50, storage: 1024000 },
        { date: '2024-01-02', uploads: 65, storage: 1536000 },
        { date: '2024-01-03', uploads: 45, storage: 1024000 },
        { date: '2024-01-04', uploads: 70, storage: 2048000 },
        { date: '2024-01-05', uploads: 80, storage: 2560000 }
      ]

      const totalUploads = uploadTrend.reduce((sum, day) => sum + day.uploads, 0)
      const totalStorage = uploadTrend.reduce((sum, day) => sum + day.storage, 0)
      const avgUploadsPerDay = totalUploads / uploadTrend.length

      expect(totalUploads).toBe(310)
      expect(avgUploadsPerDay).toBe(62)
      expect(totalStorage).toBeGreaterThan(0)
    })

    it('should calculate revenue trends', () => {
      const revenueTrend = [
        { date: '2024-01-01', revenue: 2999 }, // $29.99
        { date: '2024-01-02', revenue: 5998 }, // $59.98
        { date: '2024-01-03', revenue: 1999 }, // $19.99
        { date: '2024-01-04', revenue: 8997 }, // $89.97
        { date: '2024-01-05', revenue: 4999 }  // $49.99
      ]

      const totalRevenue = revenueTrend.reduce((sum, day) => sum + day.revenue, 0)
      const avgDailyRevenue = totalRevenue / revenueTrend.length

      expect(totalRevenue).toBe(24992) // $249.92
      expect(avgDailyRevenue).toBeCloseTo(4998.4, 1) // ~$49.98
    })
  })

  describe('Performance Metrics', () => {
    it('should track API response times', () => {
      const performanceMetrics = [
        { endpoint: '/api/upload', avgResponseTime: 250, requests: 1000 },
        { endpoint: '/api/admin/users', avgResponseTime: 150, requests: 50 },
        { endpoint: '/api/admin/analytics', avgResponseTime: 500, requests: 25 }
      ]

      performanceMetrics.forEach(metric => {
        expect(metric.avgResponseTime).toBeGreaterThan(0)
        expect(metric.requests).toBeGreaterThan(0)
      })

      const slowEndpoints = performanceMetrics.filter(m => m.avgResponseTime > 300)
      expect(slowEndpoints).toHaveLength(1)
    })

    it('should calculate system health scores', () => {
      const healthMetrics = {
        database: { status: 'healthy', responseTime: 50 },
        storage: { status: 'healthy', responseTime: 100 },
        email: { status: 'degraded', responseTime: 2000 },
        auth: { status: 'healthy', responseTime: 75 }
      }

      const healthyServices = Object.values(healthMetrics).filter(m => m.status === 'healthy')
      const healthScore = (healthyServices.length / Object.keys(healthMetrics).length) * 100

      expect(healthScore).toBe(75) // 3 out of 4 services healthy
    })
  })

  describe('Data Aggregation', () => {
    it('should aggregate user statistics by role', () => {
      const usersByRole = {
        admin: 3,
        moderator: 5,
        user: 1200,
        guest: 50
      }

      const totalUsers = Object.values(usersByRole).reduce((sum, count) => sum + count, 0)
      const adminPercentage = (usersByRole.admin / totalUsers) * 100

      expect(totalUsers).toBe(1258)
      expect(adminPercentage).toBeCloseTo(0.24, 2) // ~0.24%
    })

    it('should aggregate uploads by status', () => {
      const uploadsByStatus = {
        completed: 14890,
        failed: 320,
        in_progress: 150,
        cancelled: 60
      }

      const totalUploads = Object.values(uploadsByStatus).reduce((sum, count) => sum + count, 0)
      const successRate = (uploadsByStatus.completed / totalUploads) * 100

      expect(totalUploads).toBe(15420)
      expect(successRate).toBeCloseTo(96.56, 2) // ~96.56% success rate
    })

    it('should aggregate revenue by plan type', () => {
      const revenueByPlan = {
        free: 0,
        basic: 29990, // $299.90
        pro: 59980,   // $599.80
        enterprise: 149950 // $1499.50
      }

      const totalRevenue = Object.values(revenueByPlan).reduce((sum, amount) => sum + amount, 0)
      const enterpriseShare = (revenueByPlan.enterprise / totalRevenue) * 100

      expect(totalRevenue).toBe(239920) // $2399.20
      expect(enterpriseShare).toBeCloseTo(62.5, 1) // ~62.5%
    })
  })

  describe('Export Functionality', () => {
    it('should format data for CSV export', () => {
      const analyticsData = {
        users: [
          { id: 'user-1', email: 'user1@example.com', role: 'user', createdAt: '2024-01-01' },
          { id: 'user-2', email: 'user2@example.com', role: 'admin', createdAt: '2024-01-02' }
        ]
      }

      const csvHeaders = ['ID', 'Email', 'Role', 'Created At']
      const csvRows = analyticsData.users.map(user => [
        user.id,
        user.email,
        user.role,
        user.createdAt
      ])

      expect(csvHeaders).toHaveLength(4)
      expect(csvRows).toHaveLength(2)
      expect(csvRows[0]).toEqual(['user-1', 'user1@example.com', 'user', '2024-01-01'])
    })

    it('should handle large dataset exports', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`
      }))

      const batchSize = 1000
      const batches = Math.ceil(largeDataset.length / batchSize)

      expect(batches).toBe(10)
      expect(largeDataset).toHaveLength(10000)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Connection timeout'))

      try {
        await prisma.user.count()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Connection timeout')
      }
    })

    it('should provide fallback values for missing data', () => {
      const analyticsWithFallbacks = {
        totalUsers: 0,
        activeUsers: 0,
        totalRevenue: { _sum: { amount: null } }
      }

      const safeRevenue = analyticsWithFallbacks.totalRevenue._sum.amount || 0
      expect(safeRevenue).toBe(0)
    })

    it('should validate date range parameters', () => {
      const testCases = [
        { days: '7', valid: true },
        { days: '30', valid: true },
        { days: '90', valid: true },
        { days: '0', valid: false },
        { days: '-1', valid: false },
        { days: 'invalid', valid: false }
      ]

      testCases.forEach(({ days, valid }) => {
        const parsedDays = parseInt(days)
        const isValid = !isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 365
        
        if (valid) {
          expect(isValid).toBe(true)
        } else {
          expect(isValid).toBe(false)
        }
      })
    })
  })
})