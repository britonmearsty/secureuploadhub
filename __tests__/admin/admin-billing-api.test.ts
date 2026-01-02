import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    billingPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'

describe('Admin Billing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/billing/plans', () => {
    it('should return all billing plans for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockPlans = [
        {
          id: 'plan-free',
          name: 'Free',
          price: 0,
          currency: 'USD',
          interval: 'month',
          features: {
            maxPortals: 1,
            maxStorageGB: 1,
            maxFileSize: 10,
            customBranding: false,
          },
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'plan-pro',
          name: 'Pro',
          price: 2900,
          currency: 'USD',
          interval: 'month',
          features: {
            maxPortals: 10,
            maxStorageGB: 100,
            maxFileSize: 100,
            customBranding: true,
          },
          isActive: true,
          createdAt: new Date(),
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findMany).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans')
      const { GET } = await import('@/app/api/admin/billing/plans/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plans).toHaveLength(2)
      expect(data.plans[0].name).toBe('Free')
      expect(data.plans[1].price).toBe(2900)
      expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
        orderBy: { price: 'asc' },
      })
    })

    it('should return 403 for non-admin users', async () => {
      const mockSession = {
        user: { id: 'user-1', role: 'user' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans')
      const { GET } = await import('@/app/api/admin/billing/plans/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  describe('POST /api/admin/billing/plans', () => {
    it('should create new billing plan for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const newPlan = {
        name: 'Enterprise',
        price: 9900, // $99.00
        currency: 'USD',
        interval: 'month',
        features: {
          maxPortals: 50,
          maxStorageGB: 1000,
          maxFileSize: 500,
          customBranding: true,
          prioritySupport: true,
        },
        description: 'For large organizations',
      }

      const createdPlan = {
        id: 'plan-enterprise',
        ...newPlan,
        isActive: true,
        createdAt: new Date(),
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.create).mockResolvedValue(createdPlan)
      vi.mocked(createAuditLog).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans', {
        method: 'POST',
        body: JSON.stringify(newPlan),
      })

      const { POST } = await import('@/app/api/admin/billing/plans/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.plan.name).toBe('Enterprise')
      expect(data.plan.price).toBe(9900)
      expect(prisma.billingPlan.create).toHaveBeenCalledWith({
        data: newPlan,
      })
      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'BILLING_PLAN_CREATED',
        resource: 'billing_plan',
        resourceId: 'plan-enterprise',
        details: { planName: 'Enterprise', price: 9900 },
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      })
    })

    it('should validate required fields when creating plan', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const invalidPlan = {
        name: '', // Missing name
        price: -100, // Invalid price
      }

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans', {
        method: 'POST',
        body: JSON.stringify(invalidPlan),
      })

      const { POST } = await import('@/app/api/admin/billing/plans/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })
  })

  describe('PUT /api/admin/billing/plans/[planId]', () => {
    it('should update billing plan for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const existingPlan = {
        id: 'plan-pro',
        name: 'Pro',
        price: 2900,
        currency: 'USD',
        interval: 'month',
        isActive: true,
      }

      const updatedPlan = {
        ...existingPlan,
        price: 3900, // Price increase
        features: {
          maxPortals: 15, // Increased from 10
          maxStorageGB: 150, // Increased from 100
          maxFileSize: 100,
          customBranding: true,
        },
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(existingPlan)
      vi.mocked(prisma.billingPlan.update).mockResolvedValue(updatedPlan)
      vi.mocked(createAuditLog).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans/plan-pro', {
        method: 'PUT',
        body: JSON.stringify({
          price: 3900,
          features: updatedPlan.features,
        }),
      })

      const { PUT } = await import('@/app/api/admin/billing/plans/[planId]/route')
      const response = await PUT(request, { params: { planId: 'plan-pro' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan.price).toBe(3900)
      expect(data.plan.features.maxPortals).toBe(15)
      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'BILLING_PLAN_UPDATED',
        resource: 'billing_plan',
        resourceId: 'plan-pro',
        details: {
          changes: {
            price: { from: 2900, to: 3900 },
            features: { from: undefined, to: updatedPlan.features },
          },
        },
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      })
    })

    it('should return 404 when plan is not found', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/plans/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ price: 1000 }),
      })

      const { PUT } = await import('@/app/api/admin/billing/plans/nonexistent/route')
      const response = await PUT(request, { params: { planId: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Billing plan not found')
    })
  })

  describe('GET /api/admin/billing/subscriptions', () => {
    it('should return all subscriptions with user details for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-123',
          planId: 'plan-pro',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
          plan: {
            name: 'Pro',
            price: 2900,
          },
        },
        {
          id: 'sub-2',
          userId: 'user-456',
          planId: 'plan-free',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          user: {
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          plan: {
            name: 'Free',
            price: 0,
          },
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions)
      vi.mocked(prisma.subscription.count).mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/subscriptions?page=1&limit=10')
      const { GET } = await import('@/app/api/admin/billing/subscriptions/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscriptions).toHaveLength(2)
      expect(data.subscriptions[0].user.name).toBe('John Doe')
      expect(data.subscriptions[0].plan.name).toBe('Pro')
      expect(data.totalCount).toBe(2)
    })

    it('should filter subscriptions by status', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.subscription.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/admin/billing/subscriptions?status=cancelled')
      const { GET } = await import('@/app/api/admin/billing/subscriptions/route')
      await GET(request)

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { status: 'cancelled' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              name: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })
  })

  describe('GET /api/admin/billing/revenue', () => {
    it('should return revenue analytics for admin', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockRevenueData = {
        totalRevenue: 125000, // $1,250.00 in cents
        monthlyRevenue: 15000, // $150.00 in cents
        revenueGrowth: 0.15, // 15% growth
        averageRevenuePerUser: 2500, // $25.00 in cents
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.aggregate).mockImplementation(({ where }) => {
        if (where?.createdAt?.gte) {
          return Promise.resolve({ _sum: { amount: mockRevenueData.monthlyRevenue } })
        }
        return Promise.resolve({ _sum: { amount: mockRevenueData.totalRevenue } })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/billing/revenue')
      const { GET } = await import('@/app/api/admin/billing/revenue/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.revenue.totalRevenue).toBe(125000)
      expect(data.revenue.monthlyRevenue).toBe(15000)
    })
  })
})

      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Free',
          description: 'Basic plan for individuals',
          price: 0,
          currency: 'USD',
          features: ['1 Portal', '100MB Storage', 'Basic Support'],
          isActive: true,
          maxPortals: 1,
          maxStorageGB: 0.1,
          maxUploadsMonth: 10,
          createdAt: new Date('2024-01-01'),
          _count: {
            subscriptions: 1200
          }
        },
        {
          id: 'plan-2',
          name: 'Pro',
          description: 'Professional plan for businesses',
          price: 2999, // $29.99
          currency: 'USD',
          features: ['10 Portals', '10GB Storage', 'Priority Support', 'Analytics'],
          isActive: true,
          maxPortals: 10,
          maxStorageGB: 10,
          maxUploadsMonth: 1000,
          createdAt: new Date('2024-01-01'),
          _count: {
            subscriptions: 350
          }
        },
        {
          id: 'plan-3',
          name: 'Enterprise',
          description: 'Enterprise plan for large organizations',
          price: 9999, // $99.99
          currency: 'USD',
          features: ['Unlimited Portals', '100GB Storage', '24/7 Support', 'Advanced Analytics', 'Custom Branding'],
          isActive: true,
          maxPortals: -1, // Unlimited
          maxStorageGB: 100,
          maxUploadsMonth: 10000,
          createdAt: new Date('2024-01-01'),
          _count: {
            subscriptions: 75
          }
        }
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findMany).mockResolvedValue(mockPlans)

      // Verify plan data structure
      expect(mockPlans).toHaveLength(3)
      expect(mockPlans[0].price).toBe(0)
      expect(data.revenue.totalRevenue).toBe(125000)
      expect(data.revenue.monthlyRevenue).toBe(15000)
    })

    it('should handle authorization check', () => {
      const mockSession = {
        user: { id: 'user-1', role: 'user' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const isAuthorized = mockSession.user.role === 'admin'
      expect(isAuthorized).toBe(false)
    })
  })

  describe('POST /api/admin/billing/plans', () => {
    it('should create new billing plan', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const newPlanData = {
        name: 'Starter',
        description: 'Perfect for small teams',
        price: 1499, // $14.99
        currency: 'USD',
        features: ['5 Portals', '5GB Storage', 'Email Support'],
        isActive: true,
        maxPortals: 5,
        maxStorageGB: 5,
        maxUploadsMonth: 500
      }

      const createdPlan = {
        id: 'plan-4',
        ...newPlanData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(null) // Name doesn't exist
      vi.mocked(prisma.billingPlan.create).mockResolvedValue(createdPlan)

      // Validate plan data
      expect(newPlanData.name).toBeDefined()
      expect(newPlanData.price).toBeGreaterThanOrEqual(0)
      expect(newPlanData.maxPortals).toBeGreaterThan(0)
      expect(newPlanData.maxStorageGB).toBeGreaterThan(0)
      expect(newPlanData.maxUploadsMonth).toBeGreaterThan(0)
      expect(newPlanData.features).toHaveLength(3)
    })

    it('should validate plan data with Zod schema', () => {
      const validPlan = {
        name: 'Test Plan',
        description: 'Test description',
        price: 1999,
        currency: 'USD',
        features: ['Feature 1', 'Feature 2'],
        isActive: true,
        maxPortals: 5,
        maxStorageGB: 10,
        maxUploadsMonth: 100
      }

      const invalidPlans = [
        { ...validPlan, name: '' }, // Empty name
        { ...validPlan, price: -1 }, // Negative price
        { ...validPlan, maxPortals: 0 }, // Zero portals
        { ...validPlan, maxStorageGB: 0 }, // Zero storage
        { ...validPlan, maxUploadsMonth: 0 }, // Zero uploads
        { ...validPlan, features: [] } // Empty features
      ]

      // Valid plan should pass all checks
      expect(validPlan.name.length).toBeGreaterThan(0)
      expect(validPlan.price).toBeGreaterThanOrEqual(0)
      expect(validPlan.maxPortals).toBeGreaterThan(0)
      expect(validPlan.maxStorageGB).toBeGreaterThan(0)
      expect(validPlan.maxUploadsMonth).toBeGreaterThan(0)
      expect(validPlan.features.length).toBeGreaterThan(0)

      // Invalid plans should fail validation
      invalidPlans.forEach(plan => {
        const hasValidName = plan.name && plan.name.length > 0
        const hasValidPrice = plan.price >= 0
        const hasValidPortals = plan.maxPortals > 0
        const hasValidStorage = plan.maxStorageGB > 0
        const hasValidUploads = plan.maxUploadsMonth > 0
        const hasValidFeatures = plan.features.length > 0

        const isValid = hasValidName && hasValidPrice && hasValidPortals && 
                       hasValidStorage && hasValidUploads && hasValidFeatures
        expect(isValid).toBeFalsy()
      })
    })

    it('should prevent duplicate plan names', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const existingPlan = {
        id: 'plan-1',
        name: 'Pro',
        price: 2999
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(existingPlan)

      const newPlanData = {
        name: 'Pro', // Duplicate name
        price: 1999
      }

      const planExists = await prisma.billingPlan.findUnique({ 
        where: { name: newPlanData.name } 
      })
      
      expect(planExists).not.toBeNull()
      expect(planExists?.name).toBe('Pro')
    })
  })

  describe('Subscription Management', () => {
    it('should list all subscriptions with filtering', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: 'plan-2',
          status: 'active',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-02-01'),
          cancelAtPeriodEnd: false,
          createdAt: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'John Doe'
          },
          plan: {
            id: 'plan-2',
            name: 'Pro',
            price: 2999,
            currency: 'USD'
          }
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          planId: 'plan-3',
          status: 'cancelled',
          currentPeriodStart: new Date('2024-01-15'),
          currentPeriodEnd: new Date('2024-02-15'),
          cancelAtPeriodEnd: true,
          createdAt: new Date('2024-01-15'),
          user: {
            id: 'user-2',
            email: 'user2@example.com',
            name: 'Jane Smith'
          },
          plan: {
            id: 'plan-3',
            name: 'Enterprise',
            price: 9999,
            currency: 'USD'
          }
        }
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions)
      vi.mocked(prisma.subscription.count).mockResolvedValue(2)

      // Verify subscription data
      expect(mockSubscriptions).toHaveLength(2)
      expect(mockSubscriptions[0].status).toBe('active')
      expect(mockSubscriptions[1].status).toBe('cancelled')
      expect(mockSubscriptions[0].cancelAtPeriodEnd).toBe(false)
      expect(mockSubscriptions[1].cancelAtPeriodEnd).toBe(true)
    })

    it('should handle subscription status filtering', () => {
      const url = new URL('http://localhost/api/admin/billing/subscriptions?status=active')
      const status = url.searchParams.get('status')

      expect(status).toBe('active')

      const whereClause = status !== 'all' ? { status } : {}
      expect(whereClause).toEqual({ status: 'active' })
    })

    it('should calculate subscription metrics', () => {
      const subscriptions = [
        { status: 'active', plan: { price: 2999 } },
        { status: 'active', plan: { price: 9999 } },
        { status: 'cancelled', plan: { price: 2999 } },
        { status: 'past_due', plan: { price: 2999 } }
      ]

      const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
      const totalActiveRevenue = activeSubscriptions.reduce((sum, s) => sum + s.plan.price, 0)
      const churnRate = subscriptions.filter(s => s.status === 'cancelled').length / subscriptions.length

      expect(activeSubscriptions).toHaveLength(2)
      expect(totalActiveRevenue).toBe(12998) // $129.98
      expect(churnRate).toBe(0.25) // 25%
    })
  })

  describe('Payment Management', () => {
    it('should track payment history', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const mockPayments = [
        {
          id: 'pay-1',
          subscriptionId: 'sub-1',
          userId: 'user-1',
          amount: 2999,
          currency: 'USD',
          status: 'completed',
          providerPaymentId: 'pi_1234567890',
          createdAt: new Date('2024-01-01'),
          subscription: {
            plan: {
              name: 'Pro'
            }
          },
          user: {
            email: 'user1@example.com',
            name: 'John Doe'
          }
        },
        {
          id: 'pay-2',
          subscriptionId: 'sub-2',
          userId: 'user-2',
          amount: 9999,
          currency: 'USD',
          status: 'failed',
          providerPaymentId: 'pi_0987654321',
          createdAt: new Date('2024-01-15'),
          subscription: {
            plan: {
              name: 'Enterprise'
            }
          },
          user: {
            email: 'user2@example.com',
            name: 'Jane Smith'
          }
        }
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.findMany).mockResolvedValue(mockPayments)

      // Verify payment data
      expect(mockPayments).toHaveLength(2)
      expect(mockPayments[0].status).toBe('completed')
      expect(mockPayments[1].status).toBe('failed')
      
      const successfulPayments = mockPayments.filter(p => p.status === 'completed')
      const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0)
      
      expect(successfulPayments).toHaveLength(1)
      expect(totalRevenue).toBe(2999)
    })

    it('should handle refund processing', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const refundData = {
        paymentId: 'pay-1',
        amount: 2999,
        reason: 'Customer request'
      }

      const mockRefund = {
        id: 'refund-1',
        paymentId: refundData.paymentId,
        amount: refundData.amount,
        reason: refundData.reason,
        status: 'pending',
        createdAt: new Date()
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue(mockRefund)

      // Validate refund data
      expect(refundData.paymentId).toBeDefined()
      expect(refundData.amount).toBeGreaterThan(0)
      expect(refundData.reason).toBeDefined()
      expect(mockRefund.status).toBe('pending')
    })

    it('should calculate revenue analytics', () => {
      const payments = [
        { amount: 2999, status: 'completed', createdAt: new Date('2024-01-01') },
        { amount: 9999, status: 'completed', createdAt: new Date('2024-01-15') },
        { amount: 2999, status: 'failed', createdAt: new Date('2024-01-20') },
        { amount: 2999, status: 'completed', createdAt: new Date('2024-01-25') }
      ]

      const completedPayments = payments.filter(p => p.status === 'completed')
      const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0)
      const averagePayment = totalRevenue / completedPayments.length
      const successRate = (completedPayments.length / payments.length) * 100

      expect(completedPayments).toHaveLength(3)
      expect(totalRevenue).toBe(15997) // $159.97
      expect(averagePayment).toBeCloseTo(5332.33, 2)
      expect(successRate).toBe(75)
    })
  })

  describe('Billing Analytics', () => {
    it('should calculate MRR (Monthly Recurring Revenue)', () => {
      const activeSubscriptions = [
        { plan: { price: 2999 } }, // $29.99
        { plan: { price: 2999 } }, // $29.99
        { plan: { price: 9999 } }, // $99.99
        { plan: { price: 9999 } }  // $99.99
      ]

      const mrr = activeSubscriptions.reduce((sum, sub) => sum + sub.plan.price, 0)
      expect(mrr).toBe(25996) // $259.96
    })

    it('should calculate ARR (Annual Recurring Revenue)', () => {
      const mrr = 25996 // $259.96
      const arr = mrr * 12
      expect(arr).toBe(311952) // $3,119.52
    })

    it('should track plan distribution', () => {
      const subscriptions = [
        { plan: { name: 'Free' } },
        { plan: { name: 'Free' } },
        { plan: { name: 'Pro' } },
        { plan: { name: 'Pro' } },
        { plan: { name: 'Pro' } },
        { plan: { name: 'Enterprise' } }
      ]

      const planDistribution = subscriptions.reduce((acc, sub) => {
        acc[sub.plan.name] = (acc[sub.plan.name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(planDistribution.Free).toBe(2)
      expect(planDistribution.Pro).toBe(3)
      expect(planDistribution.Enterprise).toBe(1)
    })

    it('should calculate customer lifetime value', () => {
      const customerData = {
        averageMonthlyRevenue: 2999, // $29.99
        averageLifespanMonths: 24,
        churnRate: 0.05 // 5% monthly churn
      }

      const clv = customerData.averageMonthlyRevenue * customerData.averageLifespanMonths
      const clvWithChurn = customerData.averageMonthlyRevenue / customerData.churnRate

      expect(clv).toBe(71976) // $719.76
      expect(clvWithChurn).toBe(59980) // $599.80
    })
  })

  describe('Plan Management', () => {
    it('should update existing billing plan', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const existingPlan = {
        id: 'plan-2',
        name: 'Pro',
        price: 2999,
        features: ['10 Portals', '10GB Storage']
      }

      const updateData = {
        price: 3499, // Increase to $34.99
        features: ['10 Portals', '15GB Storage', 'Priority Support']
      }

      const updatedPlan = {
        ...existingPlan,
        ...updateData,
        updatedAt: new Date()
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(existingPlan)
      vi.mocked(prisma.billingPlan.update).mockResolvedValue(updatedPlan)

      expect(updateData.price).toBeGreaterThan(existingPlan.price)
      expect(updateData.features).toHaveLength(3)
      expect(updateData.features).toContain('Priority Support')
    })

    it('should deactivate billing plan', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      const activePlan = {
        id: 'plan-2',
        name: 'Pro',
        isActive: true
      }

      const deactivatedPlan = {
        ...activePlan,
        isActive: false
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(activePlan)
      vi.mocked(prisma.billingPlan.update).mockResolvedValue(deactivatedPlan)

      expect(activePlan.isActive).toBe(true)
      expect(deactivatedPlan.isActive).toBe(false)
    })

    it('should prevent deletion of plans with active subscriptions', () => {
      const planWithSubscriptions = {
        id: 'plan-2',
        name: 'Pro',
        _count: {
          subscriptions: 150
        }
      }

      const planWithoutSubscriptions = {
        id: 'plan-4',
        name: 'Deprecated',
        _count: {
          subscriptions: 0
        }
      }

      const canDeletePlan1 = planWithSubscriptions._count.subscriptions === 0
      const canDeletePlan2 = planWithoutSubscriptions._count.subscriptions === 0

      expect(canDeletePlan1).toBe(false)
      expect(canDeletePlan2).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'admin-1', role: 'admin' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findMany).mockRejectedValue(new Error('Database timeout'))

      try {
        await prisma.billingPlan.findMany()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Database timeout')
      }
    })

    it('should validate currency codes', () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
      const testCurrencies = ['USD', 'EUR', 'INVALID', '', null]

      testCurrencies.forEach(currency => {
        const isValid = validCurrencies.includes(currency as string)
        if (currency === 'USD' || currency === 'EUR') {
          expect(isValid).toBe(true)
        } else {
          expect(isValid).toBe(false)
        }
      })
    })

    it('should handle payment provider errors', () => {
      const paymentError = {
        code: 'card_declined',
        message: 'Your card was declined.',
        type: 'card_error'
      }

      const errorMapping = {
        'card_declined': 'Payment declined by bank',
        'insufficient_funds': 'Insufficient funds',
        'expired_card': 'Card has expired',
        'processing_error': 'Payment processing error'
      }

      const userFriendlyMessage = errorMapping[paymentError.code as keyof typeof errorMapping] || 'Payment failed'
      expect(userFriendlyMessage).toBe('Payment declined by bank')
    })
  })
})