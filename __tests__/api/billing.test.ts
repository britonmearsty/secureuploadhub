import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    billingPlan: {
      findMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/billing', () => ({
  getPaystack: vi.fn(),
}))

vi.mock('@/lib/paystack-config', () => ({
  PAYSTACK_CONFIG: {
    secretKey: 'test-secret',
  },
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getPaystack } from '@/lib/billing'

describe('API Route: /api/billing/plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/billing/plans', () => {
    it('should return all available billing plans', async () => {
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
        },
        {
          id: 'plan-pro',
          name: 'Pro',
          price: 2900, // $29.00 in cents
          currency: 'USD',
          interval: 'month',
          features: {
            maxPortals: 10,
            maxStorageGB: 100,
            maxFileSize: 100,
            customBranding: true,
          },
        },
      ]

      vi.mocked(prisma.billingPlan.findMany).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/billing/plans')
      const { GET } = await import('@/app/api/billing/plans/route')
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

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.billingPlan.findMany).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/billing/plans')
      const { GET } = await import('@/app/api/billing/plans/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch billing plans')
    })
  })

  describe('POST /api/billing/subscribe', () => {
    it('should create subscription with valid plan', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockPlan = {
        id: 'plan-pro',
        name: 'Pro',
        price: 2900,
        currency: 'USD',
      }

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan)
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription)

      const request = new NextRequest('http://localhost:3000/api/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription.id).toBe('sub-123')
      expect(data.subscription.status).toBe('active')
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          planId: 'plan-pro',
          status: 'active',
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
        },
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when plan is not found', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: 'invalid-plan' }),
      })

      const { POST } = await import('@/app/api/billing/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan')
    })
  })

  describe('POST /api/billing/webhook', () => {
    it('should handle Paystack webhook events', async () => {
      const mockWebhookPayload = {
        event: 'charge.success',
        data: {
          id: 'charge-123',
          amount: 2900,
          currency: 'USD',
          customer: {
            email: 'user@example.com',
          },
          metadata: {
            userId: 'user-123',
            planId: 'plan-pro',
          },
        },
      }

      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 2900,
        currency: 'USD',
        status: 'completed',
        paystackChargeId: 'charge-123',
      }

      vi.mocked(prisma.payment.create).mockResolvedValue(mockPayment)

      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(mockWebhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          amount: 2900,
          currency: 'USD',
          status: 'completed',
          paystackChargeId: 'charge-123',
          planId: 'plan-pro',
        },
      })
    })

    it('should reject webhooks with invalid signatures', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({ event: 'charge.success' }),
        headers: {
          'x-paystack-signature': 'invalid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
    it('should return active billing plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic',
          price: 1000,
          currency: 'NGN',
          interval: 'monthly',
          isActive: true,
        },
        {
          id: 'plan-2',
          name: 'Pro',
          price: 2000,
          currency: 'NGN',
          interval: 'monthly',
          isActive: true,
        },
      ]

      vi.mocked(prisma.billingPlan.findMany).mockResolvedValue(mockPlans as any)

      // Import the route handler
      const { GET } = await import('@/app/api/billing/plans/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockPlans)
      expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      })
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.billingPlan.findMany).mockRejectedValue(new Error('DB Error'))

      const { GET } = await import('@/app/api/billing/plans/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch billing plans')
    })
  })

describe('API Route: /api/billing/subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/billing/subscription', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const { GET } = await import('@/app/api/billing/subscription/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user subscription with plan and payments', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        status: 'active',
        plan: {
          id: 'plan-1',
          name: 'Basic',
          price: 1000,
        },
        payments: [
          {
            id: 'payment-1',
            amount: 1000,
            status: 'completed',
            createdAt: new Date(),
          },
        ],
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)

      const { GET } = await import('@/app/api/billing/subscription/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toEqual(mockSubscription)
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['active', 'past_due', 'incomplete'] },
        },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
    })

    it('should return null when no subscription exists', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)

      const { GET } = await import('@/app/api/billing/subscription/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toBeNull()
    })

    it('should handle database errors', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockRejectedValue(new Error('DB Error'))

      const { GET } = await import('@/app/api/billing/subscription/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch subscription')
    })
  })

  describe('POST /api/billing/subscription', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-1' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when planId is missing', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Plan ID is required')
    })

    it('should return 400 when user already has active subscription', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockExistingSubscription = {
        id: 'sub-1',
        status: 'active',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockExistingSubscription as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-1' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('You already have an active subscription')
    })

    it('should create subscription and payment successfully', async () => {
      const mockSession = { 
        user: { 
          id: 'user-1', 
          email: 'user@example.com',
          name: 'John Doe'
        } 
      }
      const mockPlan = {
        id: 'plan-1',
        name: 'Basic',
        price: 1000,
        currency: 'NGN',
      }
      const mockPaystackResponse = {
        data: {
          authorization_url: 'https://checkout.paystack.com/xyz',
          reference: 'ref-123',
        },
      }
      const mockCreatedSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'pending',
      }
      const mockCreatedPayment = {
        id: 'payment-1',
        subscriptionId: 'sub-1',
        amount: 1000,
        status: 'pending',
        reference: 'ref-123',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      
      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockResolvedValue(mockPaystackResponse),
        },
      }
      vi.mocked(getPaystack).mockReturnValue(mockPaystack as any)
      
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockCreatedSubscription as any)
      vi.mocked(prisma.payment.create).mockResolvedValue(mockCreatedPayment as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-1' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toEqual(mockCreatedSubscription)
      expect(data.paymentLink).toBe('https://checkout.paystack.com/xyz')
      expect(data.reference).toBe('ref-123')
      expect(mockPaystack.transaction.initialize).toHaveBeenCalledWith({
        email: 'user@example.com',
        amount: 100000, // 1000 * 100 (kobo conversion)
        currency: 'NGN',
        reference: expect.any(String),
        callback_url: expect.stringContaining('/billing/callback'),
        metadata: {
          userId: 'user-1',
          planId: 'plan-1',
          subscriptionId: 'sub-1',
        },
      })
    })

    it('should handle Paystack initialization errors', async () => {
      const mockSession = { 
        user: { 
          id: 'user-1', 
          email: 'user@example.com',
          name: 'John Doe'
        } 
      }
      const mockPlan = {
        id: 'plan-1',
        name: 'Basic',
        price: 1000,
        currency: 'NGN',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      
      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockRejectedValue(new Error('Paystack error')),
        },
      }
      vi.mocked(getPaystack).mockReturnValue(mockPaystack as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-1' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to initialize payment')
    })
  })

  describe('DELETE /api/billing/subscription', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when no active subscription exists', async () => {
      const mockSession = { user: { id: 'user-1' } }
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No active subscription found')
    })

    it('should cancel subscription successfully', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        status: 'active',
        cancelAtPeriodEnd: false,
      }
      const mockUpdatedSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockUpdatedSubscription as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toEqual(mockUpdatedSubscription)
      expect(data.message).toBe('Subscription will be cancelled at the end of the current period')
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { cancelAtPeriodEnd: true },
      })
    })

    it('should handle database errors during cancellation', async () => {
      const mockSession = { user: { id: 'user-1' } }
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        status: 'active',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.subscription.update).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to cancel subscription')
    })
  })
})