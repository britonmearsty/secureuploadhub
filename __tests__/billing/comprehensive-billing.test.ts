import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    billingPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscriptionHistory: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/billing', () => ({
  getPaystack: vi.fn(),
}))

vi.mock('@/lib/paystack-config', () => ({
  PAYSTACK_CONFIG: {
    secretKey: 'test-secret-key',
    publicKey: 'test-public-key',
  },
}))

vi.mock('@/lib/subscription-manager', () => ({
  activateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}))

vi.mock('@/lib/billing-constants', () => ({
  SUBSCRIPTION_STATUS: {
    ACTIVE: 'active',
    INCOMPLETE: 'incomplete',
    PAST_DUE: 'past_due',
    CANCELLED: 'cancelled',
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
  },
  BILLING_INTERVAL: {
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  },
}))

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  AUDIT_ACTIONS: {
    SUBSCRIPTION_CREATED: 'subscription_created',
    SUBSCRIPTION_ACTIVATED: 'subscription_activated',
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    PAYMENT_SUCCEEDED: 'payment_succeeded',
    PAYMENT_FAILED: 'payment_failed',
  },
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getPaystack } from '@/lib/billing'
import { activateSubscription, cancelSubscription } from '@/lib/subscription-manager'

describe('Comprehensive Billing System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Billing Plans API', () => {
    it('should return all active billing plans', async () => {
      const mockPlans = [
        {
          id: 'plan-free',
          name: 'Free',
          price: 0,
          currency: 'NGN',
          interval: 'monthly',
          isActive: true,
          features: {
            maxPortals: 1,
            maxStorageGB: 1,
            maxFileSize: 10,
          },
        },
        {
          id: 'plan-pro',
          name: 'Pro',
          price: 2900,
          currency: 'NGN',
          interval: 'monthly',
          isActive: true,
          features: {
            maxPortals: 10,
            maxStorageGB: 100,
            maxFileSize: 100,
          },
        },
      ]

      vi.mocked(prisma.billingPlan.findMany).mockResolvedValue(mockPlans as any)

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

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.billingPlan.findMany).mockRejectedValue(new Error('Database connection failed'))

      const { GET } = await import('@/app/api/billing/plans/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch billing plans')
    })
  })

  describe('Subscription Creation Flow', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
      },
    }

    const mockPlan = {
      id: 'plan-pro',
      name: 'Pro',
      price: 2900,
      currency: 'NGN',
      interval: 'monthly',
      isActive: true,
    }

    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'John Doe',
    }

    it('should create subscription and initialize payment successfully', async () => {
      const mockPaystackResponse = {
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/xyz123',
          access_code: 'access-code-123',
          reference: 'ref-123456789',
        },
      }

      const mockCreatedSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'incomplete',
        createdAt: new Date(),
      }

      const mockCreatedPayment = {
        id: 'payment-123',
        subscriptionId: 'sub-123',
        userId: 'user-123',
        amount: 29,
        currency: 'NGN',
        status: 'pending',
        providerPaymentRef: 'ref-123456789',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null) // No existing subscription
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockCreatedSubscription as any)
      vi.mocked(prisma.payment.create).mockResolvedValue(mockCreatedPayment as any)

      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockResolvedValue(mockPaystackResponse),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentLink).toBe('https://checkout.paystack.com/xyz123')
      expect(data.subscription.id).toBe('sub-123')
      expect(mockPaystack.transaction.initialize).toHaveBeenCalledWith({
        email: 'user@example.com',
        amount: 290000, // 2900 * 100 (kobo conversion)
        currency: 'NGN',
        reference: expect.any(String),
        callback_url: expect.stringContaining('/dashboard/billing'),
        metadata: {
          subscription_id: 'sub-123',
          user_id: 'user-123',
          plan_id: 'plan-pro',
          type: 'subscription_setup',
          customer_name: 'John Doe',
          plan_name: 'Pro',
        },
      })
    })

    it('should prevent duplicate subscriptions', async () => {
      const existingSubscription = {
        id: 'sub-existing',
        userId: 'user-123',
        status: 'active',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(existingSubscription as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User already has an active subscription')
    })

    it('should handle invalid plan IDs', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'invalid-plan' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Plan not found')
    })

    it('should handle Paystack initialization failures', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockRejectedValue(new Error('Paystack API error')),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to initialize payment')
    })
  })

  describe('Webhook Processing', () => {
    it('should handle charge.success webhook correctly', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 'charge-123',
          reference: 'ref-123456789',
          amount: 290000,
          currency: 'NGN',
          status: 'success',
          customer: {
            email: 'user@example.com',
          },
          metadata: {
            subscription_id: 'sub-123',
            user_id: 'user-123',
            plan_id: 'plan-pro',
            type: 'subscription_setup',
          },
          authorization: {
            authorization_code: 'auth-code-123',
          },
        },
      }

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
        user: { email: 'user@example.com' },
      }

      const mockActivationResult = {
        isNew: true,
        result: { success: true, reason: 'activated' },
        fromCache: false,
      }

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(activateSubscription).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        paymentData: {
          reference: 'ref-123456789',
          paymentId: 'charge-123',
          amount: 290000,
          currency: 'NGN',
          authorization: {
            authorization_code: 'auth-code-123',
          },
        },
        source: 'webhook',
      })
    })

    it('should handle charge.failed webhook correctly', async () => {
      const webhookPayload = {
        event: 'charge.failed',
        data: {
          id: 'charge-failed-123',
          reference: 'ref-failed-123',
          amount: 290000,
          currency: 'NGN',
          status: 'failed',
          customer: {
            email: 'user@example.com',
          },
          metadata: {
            subscription_id: 'sub-123',
            user_id: 'user-123',
          },
        },
      }

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          subscriptionId: 'sub-123',
          userId: 'user-123',
          amount: 2900,
          currency: 'NGN',
          status: 'failed',
          description: 'Failed payment for Pro plan',
          providerPaymentId: 'charge-failed-123',
          providerPaymentRef: 'ref-failed-123',
        },
      })
    })

    it('should handle subscription renewal webhooks', async () => {
      const webhookPayload = {
        event: 'invoice.payment_succeeded',
        data: {
          id: 'invoice-123',
          reference: 'ref-renewal-123',
          amount: 290000,
          currency: 'NGN',
          subscription: {
            subscription_code: 'sub-code-123',
          },
        },
      }

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'active',
        providerSubscriptionId: 'sub-code-123',
        plan: { name: 'Pro', currency: 'NGN' },
        user: { email: 'user@example.com' },
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma as any)
      })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.subscription.update).toHaveBeenCalled()
      expect(prisma.payment.create).toHaveBeenCalled()
    })
  })

  describe('Subscription Status Checking', () => {
    const mockSession = { user: { id: 'user-123' } }

    it('should check and activate incomplete subscription with recent payment', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      const mockRecentPayment = {
        id: 'payment-123',
        subscriptionId: 'sub-123',
        status: 'succeeded',
        amount: 29,
        currency: 'NGN',
        providerPaymentRef: 'ref-123',
        providerPaymentId: 'charge-123',
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      }

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockRecentPayment as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/status', {
        method: 'POST',
      })

      const { POST } = await import('@/app/api/billing/subscription/status/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toBe(true)
      expect(data.message).toContain('activated successfully')
      expect(activateSubscription).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        paymentData: {
          reference: 'ref-123',
          paymentId: 'charge-123',
          amount: 2900,
          currency: 'NGN',
        },
        source: 'manual_check',
      })
    })

    it('should verify pending payments with Paystack', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      const mockPendingPayment = {
        id: 'payment-123',
        subscriptionId: 'sub-123',
        status: 'pending',
        providerPaymentRef: 'ref-pending-123',
      }

      const mockPaystackVerification = {
        status: true,
        data: {
          status: 'success',
          amount: 290000,
          currency: 'NGN',
          id: 'charge-verified-123',
          authorization: {
            authorization_code: 'auth-code-123',
          },
        },
      }

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null) // No recent successful payment
      vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPendingPayment] as any)

      const mockPaystack = {
        transaction: {
          verify: vi.fn().mockResolvedValue(mockPaystackVerification),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/status', {
        method: 'POST',
      })

      const { POST } = await import('@/app/api/billing/subscription/status/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPaystack.transaction.verify).toHaveBeenCalledWith('ref-pending-123')
      expect(activateSubscription).toHaveBeenCalled()
    })

    it('should return appropriate message when no subscription found', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/status', {
        method: 'POST',
      })

      const { POST } = await import('@/app/api/billing/subscription/status/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No subscription found')
    })
  })

  describe('Subscription Recovery', () => {
    const mockSession = { user: { id: 'user-123' } }

    it('should recover subscription using payment reference', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      const mockPaystackVerification = {
        status: true,
        data: {
          status: 'success',
          amount: 290000,
          currency: 'NGN',
          id: 'charge-123',
          authorization: {
            authorization_code: 'auth-code-123',
          },
        },
      }

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null) // No existing payment

      const mockPaystack = {
        transaction: {
          verify: vi.fn().mockResolvedValue(mockPaystackVerification),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
          paymentReference: 'ref-123456789',
        }),
      })

      const { POST } = await import('@/app/api/billing/subscription/recover/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recovery.success).toBe(true)
      expect(data.recovery.method).toBe('payment_reference')
      expect(mockPaystack.transaction.verify).toHaveBeenCalledWith('ref-123456789')
      expect(activateSubscription).toHaveBeenCalled()
    })

    it('should recover subscription by finding unlinked payments', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      const mockUnlinkedPayment = {
        id: 'payment-unlinked',
        userId: 'user-123',
        subscriptionId: null,
        status: 'succeeded',
        amount: 29,
        currency: 'NGN',
        providerPaymentRef: 'ref-unlinked-123',
        providerPaymentId: 'charge-unlinked-123',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      }

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findMany).mockResolvedValue([mockUnlinkedPayment] as any)
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
        }),
      })

      const { POST } = await import('@/app/api/billing/subscription/recover/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recovery.success).toBe(true)
      expect(data.recovery.method).toBe('unlinked_payment')
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-unlinked' },
        data: { subscriptionId: 'sub-123' },
      })
      expect(activateSubscription).toHaveBeenCalled()
    })

    it('should return error when no unlinked payments found', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]) // No unlinked payments

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
        }),
      })

      const { POST } = await import('@/app/api/billing/subscription/recover/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recovery.success).toBe(false)
      expect(data.recovery.message).toBe('No unlinked successful payments found for this user in the last 30 days')
    })

    it('should handle invalid payment reference', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: { name: 'Pro', currency: 'NGN' },
      }

      const mockPaystackVerification = {
        status: false,
        message: 'Transaction not found',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)

      const mockPaystack = {
        transaction: {
          verify: vi.fn().mockResolvedValue(mockPaystackVerification),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
          paymentReference: 'invalid-ref',
        }),
      })

      const { POST } = await import('@/app/api/billing/subscription/recover/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recovery.success).toBe(false)
      expect(data.recovery.message).toContain('verification failed')
    })
  })

  describe('Subscription Cancellation', () => {
    const mockSession = { user: { id: 'user-123' } }

    it('should cancel active subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'active',
        cancelAtPeriodEnd: false,
      }

      const mockCancellationResult = {
        success: true,
        subscription: { ...mockSubscription, cancelAtPeriodEnd: true },
        message: 'Subscription will be cancelled at the end of the current period',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(cancelSubscription).mockResolvedValue(mockCancellationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('cancelled at the end')
      expect(cancelSubscription).toHaveBeenCalledWith('user-123')
    })

    it('should immediately cancel incomplete subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
      }

      const mockCancellationResult = {
        success: true,
        subscription: { ...mockSubscription, status: 'cancelled' },
        message: 'Subscription cancelled immediately',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(cancelSubscription).mockResolvedValue(mockCancellationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('cancelled immediately')
    })

    it('should handle cancellation when no subscription exists', async () => {
      const mockCancellationResult = {
        success: false,
        error: 'No active subscription found',
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(cancelSubscription).mockResolvedValue(mockCancellationResult as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/billing/subscription/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No active subscription found')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 for all endpoints when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const endpoints = [
        { path: '/api/billing/subscription', method: 'GET' },
        { path: '/api/billing/subscription', method: 'POST' },
        { path: '/api/billing/subscription', method: 'DELETE' },
        { path: '/api/billing/subscription/status', method: 'POST' },
        { path: '/api/billing/subscription/recover', method: 'POST' },
      ]

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.path}`, {
          method: endpoint.method,
          body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined,
        })

        let routeHandler
        if (endpoint.path.includes('/status')) {
          const route = await import('@/app/api/billing/subscription/status/route')
          routeHandler = route[endpoint.method as keyof typeof route]
        } else if (endpoint.path.includes('/recover')) {
          const route = await import('@/app/api/billing/subscription/recover/route')
          routeHandler = route[endpoint.method as keyof typeof route]
        } else {
          const route = await import('@/app/api/billing/subscription/route')
          routeHandler = route[endpoint.method as keyof typeof route]
        }

        const response = await routeHandler(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      }
    })
  })

  describe('Error Handling', () => {
    const mockSession = { user: { id: 'user-123' } }

    it('should handle database connection errors', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/billing/subscription/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch subscription')
    })

    it('should handle Paystack API errors gracefully', async () => {
      const mockPlan = {
        id: 'plan-pro',
        name: 'Pro',
        price: 2900,
        currency: 'NGN',
        isActive: true,
      }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any)

      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockRejectedValue(new Error('Paystack service unavailable')),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to initialize payment')
    })

    it('should handle malformed request bodies', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: 'invalid-json',
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('Edge Cases and Race Conditions', () => {
    it('should handle concurrent subscription creation attempts', async () => {
      const mockSession = { user: { id: 'user-123' } }
      const mockPlan = { id: 'plan-pro', name: 'Pro', price: 2900, currency: 'NGN', isActive: true }

      vi.mocked(auth).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any)

      // First call: no existing subscription
      // Second call: subscription exists (simulating race condition)
      vi.mocked(prisma.subscription.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'sub-123', status: 'active' } as any)

      const request1 = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const request2 = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST } = await import('@/app/api/billing/subscription/route')
      
      // Simulate concurrent requests
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ])

      // One should succeed, one should fail with duplicate subscription error
      const responses = [response1, response2]
      const statuses = responses.map(r => r.status)
      
      expect(statuses).toContain(400) // At least one should fail with duplicate error
    })

    it('should handle webhook replay attacks', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 'charge-123',
          reference: 'ref-duplicate',
          amount: 290000,
          currency: 'NGN',
          status: 'success',
          metadata: {
            subscription_id: 'sub-123',
          },
        },
      }

      // Mock existing payment with same reference
      const existingPayment = {
        id: 'payment-existing',
        providerPaymentRef: 'ref-duplicate',
        status: 'succeeded',
      }

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(existingPayment as any)

      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST } = await import('@/app/api/billing/webhook/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should not create duplicate payment
      expect(prisma.payment.create).not.toHaveBeenCalled()
    })
  })
})