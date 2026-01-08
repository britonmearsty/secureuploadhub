import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the entire billing flow
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

vi.mock('@/lib/subscription-manager', () => ({
  activateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}))

vi.mock('@/lib/distributed-lock', () => ({
  DistributedLock: vi.fn().mockImplementation(() => ({
    acquire: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(true),
  })),
}))

vi.mock('@/lib/idempotency', () => ({
  withIdempotency: vi.fn().mockImplementation(async (key, fn) => {
    return { isNew: true, result: await fn(), fromCache: false }
  }),
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getPaystack } from '@/lib/billing'
import { activateSubscription, cancelSubscription } from '@/lib/subscription-manager'

describe('Billing Flow Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'John Doe',
  }

  const mockSession = { user: mockUser }

  const mockPlan = {
    id: 'plan-pro',
    name: 'Pro Plan',
    price: 2900,
    currency: 'NGN',
    interval: 'monthly',
    isActive: true,
    features: {
      maxPortals: 10,
      maxStorageGB: 100,
      maxFileSize: 100,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue(mockPlan as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Subscription Flow - Happy Path', () => {
    it('should complete entire subscription flow from creation to activation', async () => {
      // Step 1: User creates subscription
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

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null) // No existing subscription
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockCreatedSubscription as any)
      vi.mocked(prisma.payment.create).mockResolvedValue(mockCreatedPayment as any)

      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockResolvedValue(mockPaystackResponse),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      // Create subscription
      const createRequest = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST: createSubscription } = await import('@/app/api/billing/subscription/route')
      const createResponse = await createSubscription(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(200)
      expect(createData.paymentLink).toBe('https://checkout.paystack.com/xyz123')
      expect(createData.subscription.status).toBe('incomplete')

      // Step 2: Webhook receives payment success
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

      const mockActivationResult = {
        isNew: true,
        result: { success: true, reason: 'activated', subscription: { ...mockCreatedSubscription, status: 'active' } },
        fromCache: false,
      }

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockCreatedSubscription,
        plan: mockPlan,
        user: mockUser,
      } as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      // Process webhook
      const webhookRequest = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST: processWebhook } = await import('@/app/api/billing/webhook/route')
      const webhookResponse = await processWebhook(webhookRequest)

      expect(webhookResponse.status).toBe(200)
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

      // Step 3: User checks subscription status
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        ...mockCreatedSubscription,
        status: 'active',
        plan: mockPlan,
        payments: [{ ...mockCreatedPayment, status: 'succeeded' }],
      } as any)

      const statusRequest = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'GET',
      })

      const { GET: getSubscription } = await import('@/app/api/billing/subscription/route')
      const statusResponse = await getSubscription(statusRequest)
      const statusData = await statusResponse.json()

      expect(statusResponse.status).toBe(200)
      expect(statusData.subscription.status).toBe('active')
      expect(statusData.subscription.plan.name).toBe('Pro Plan')
    })
  })

  describe('Subscription Recovery Flow', () => {
    it('should recover subscription when webhook fails but payment succeeds', async () => {
      // Scenario: User paid successfully but webhook failed to activate subscription
      const mockIncompleteSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'incomplete',
        plan: mockPlan,
      }

      const mockSuccessfulPayment = {
        id: 'payment-123',
        subscriptionId: 'sub-123',
        userId: 'user-123',
        amount: 29,
        currency: 'NGN',
        status: 'succeeded',
        providerPaymentRef: 'ref-123456789',
        providerPaymentId: 'charge-123',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      }

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockIncompleteSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockSuccessfulPayment as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      // User clicks "Check Status Now"
      const statusCheckRequest = new NextRequest('http://localhost:3000/api/billing/subscription/status', {
        method: 'POST',
      })

      const { POST: checkStatus } = await import('@/app/api/billing/subscription/status/route')
      const statusResponse = await checkStatus(statusCheckRequest)
      const statusData = await statusResponse.json()

      expect(statusResponse.status).toBe(200)
      expect(statusData.updated).toBe(true)
      expect(statusData.message).toContain('activated successfully')
      expect(activateSubscription).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        paymentData: {
          reference: 'ref-123456789',
          paymentId: 'charge-123',
          amount: 2900,
          currency: 'NGN',
        },
        source: 'manual_check',
      })
    })

    it('should recover subscription using payment reference', async () => {
      const mockIncompleteSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: mockPlan,
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

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockIncompleteSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null) // No existing payment

      const mockPaystack = {
        transaction: {
          verify: vi.fn().mockResolvedValue(mockPaystackVerification),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      // User provides payment reference for recovery
      const recoveryRequest = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
          paymentReference: 'ref-manual-123',
        }),
      })

      const { POST: recoverSubscription } = await import('@/app/api/billing/subscription/recover/route')
      const recoveryResponse = await recoverSubscription(recoveryRequest)
      const recoveryData = await recoveryResponse.json()

      expect(recoveryResponse.status).toBe(200)
      expect(recoveryData.recovery.success).toBe(true)
      expect(recoveryData.recovery.method).toBe('payment_reference')
      expect(mockPaystack.transaction.verify).toHaveBeenCalledWith('ref-manual-123')
    })

    it('should find and link unlinked payments', async () => {
      const mockIncompleteSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: mockPlan,
      }

      const mockUnlinkedPayment = {
        id: 'payment-unlinked',
        userId: 'user-123',
        subscriptionId: null, // Unlinked
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

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockIncompleteSubscription as any)
      vi.mocked(prisma.payment.findMany).mockResolvedValue([mockUnlinkedPayment] as any)
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      // User tries recovery without payment reference
      const recoveryRequest = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub-123',
        }),
      })

      const { POST: recoverSubscription } = await import('@/app/api/billing/subscription/recover/route')
      const recoveryResponse = await recoverSubscription(recoveryRequest)
      const recoveryData = await recoveryResponse.json()

      expect(recoveryResponse.status).toBe(200)
      expect(recoveryData.recovery.success).toBe(true)
      expect(recoveryData.recovery.method).toBe('unlinked_payment')
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-unlinked' },
        data: { subscriptionId: 'sub-123' },
      })
    })
  })

  describe('Subscription Renewal Flow', () => {
    it('should handle successful subscription renewal', async () => {
      const mockActiveSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'active',
        providerSubscriptionId: 'sub-code-123',
        plan: mockPlan,
        user: mockUser,
      }

      const renewalWebhookPayload = {
        event: 'invoice.payment_succeeded',
        data: {
          id: 'invoice-123',
          reference: 'ref-renewal-123',
          amount: 290000,
          currency: 'NGN',
          subscription: {
            subscription_code: 'sub-code-123',
          },
          paid_at: new Date().toISOString(),
        },
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockActiveSubscription as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma as any)
      })
      vi.mocked(prisma.subscription.update).mockResolvedValue({
        ...mockActiveSubscription,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)

      const webhookRequest = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(renewalWebhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST: processWebhook } = await import('@/app/api/billing/webhook/route')
      const webhookResponse = await processWebhook(webhookRequest)

      expect(webhookResponse.status).toBe(200)
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: expect.objectContaining({
          status: 'active',
          cancelAtPeriodEnd: false,
          retryCount: 0,
          gracePeriodEnd: null,
        }),
      })
      expect(prisma.payment.create).toHaveBeenCalled()
    })

    it('should handle failed renewal payments', async () => {
      const mockActiveSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'active',
        providerSubscriptionId: 'sub-code-123',
        plan: mockPlan,
        user: mockUser,
        retryCount: 0,
      }

      const failedRenewalWebhook = {
        event: 'invoice.payment_failed',
        data: {
          reference: 'ref-failed-renewal',
          amount: 290000,
          currency: 'NGN',
          subscription: {
            subscription_code: 'sub-code-123',
          },
        },
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockActiveSubscription as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma as any)
      })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as any)
      vi.mocked(prisma.subscriptionHistory.create).mockResolvedValue({} as any)

      const webhookRequest = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(failedRenewalWebhook),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST: processWebhook } = await import('@/app/api/billing/webhook/route')
      const webhookResponse = await processWebhook(webhookRequest)

      expect(webhookResponse.status).toBe(200)
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: expect.objectContaining({
          status: 'past_due',
          retryCount: 1,
          gracePeriodEnd: expect.any(Date),
        }),
      })
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          description: expect.stringContaining('Failed invoice payment'),
        }),
      })
    })
  })

  describe('Subscription Cancellation Flow', () => {
    it('should cancel active subscription at period end', async () => {
      const mockCancellationResult = {
        success: true,
        subscription: {
          id: 'sub-123',
          status: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        },
        message: 'Subscription will be cancelled at the end of the current period',
      }

      vi.mocked(cancelSubscription).mockResolvedValue(mockCancellationResult as any)

      const cancelRequest = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE: cancelSubscriptionEndpoint } = await import('@/app/api/billing/subscription/route')
      const cancelResponse = await cancelSubscriptionEndpoint(cancelRequest)
      const cancelData = await cancelResponse.json()

      expect(cancelResponse.status).toBe(200)
      expect(cancelData.success).toBe(true)
      expect(cancelData.subscription.cancelAtPeriodEnd).toBe(true)
      expect(cancelData.message).toContain('cancelled at the end')
    })

    it('should immediately cancel incomplete subscription', async () => {
      const mockCancellationResult = {
        success: true,
        subscription: {
          id: 'sub-123',
          status: 'cancelled',
        },
        message: 'Subscription cancelled immediately',
      }

      vi.mocked(cancelSubscription).mockResolvedValue(mockCancellationResult as any)

      const cancelRequest = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      })

      const { DELETE: cancelSubscriptionEndpoint } = await import('@/app/api/billing/subscription/route')
      const cancelResponse = await cancelSubscriptionEndpoint(cancelRequest)
      const cancelData = await cancelResponse.json()

      expect(cancelResponse.status).toBe(200)
      expect(cancelData.success).toBe(true)
      expect(cancelData.subscription.status).toBe('cancelled')
      expect(cancelData.message).toContain('cancelled immediately')
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle partial payment processing failures', async () => {
      // Scenario: Subscription created but payment initialization failed
      const mockCreatedSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockCreatedSubscription as any)

      const mockPaystack = {
        transaction: {
          initialize: vi.fn().mockRejectedValue(new Error('Paystack API error')),
        },
      }
      vi.mocked(getPaystack).mockResolvedValue(mockPaystack as any)

      const createRequest = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId: 'plan-pro' }),
      })

      const { POST: createSubscription } = await import('@/app/api/billing/subscription/route')
      const createResponse = await createSubscription(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(500)
      expect(createData.error).toBe('Failed to initialize payment')

      // User should be able to retry or recover
      // The incomplete subscription exists and can be recovered later
      expect(prisma.subscription.create).toHaveBeenCalled()
    })

    it('should handle webhook processing with missing subscription', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 'charge-orphan',
          reference: 'ref-orphan',
          amount: 290000,
          currency: 'NGN',
          status: 'success',
          metadata: {
            subscription_id: 'sub-nonexistent',
          },
        },
      }

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const webhookRequest = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'x-paystack-signature': 'valid-signature',
        },
      })

      const { POST: processWebhook } = await import('@/app/api/billing/webhook/route')
      const webhookResponse = await processWebhook(webhookRequest)

      // Should handle gracefully without crashing
      expect(webhookResponse.status).toBe(200)
      expect(activateSubscription).not.toHaveBeenCalled()
    })

    it('should handle concurrent activation attempts', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: mockPlan,
        user: mockUser,
      }

      // First activation succeeds
      const firstActivationResult = {
        isNew: true,
        result: { success: true, reason: 'activated' },
        fromCache: false,
      }

      // Second activation is from cache (idempotent)
      const secondActivationResult = {
        isNew: false,
        result: { success: true, reason: 'already_active' },
        fromCache: true,
      }

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(activateSubscription)
        .mockResolvedValueOnce(firstActivationResult as any)
        .mockResolvedValueOnce(secondActivationResult as any)

      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 'charge-123',
          reference: 'ref-concurrent',
          amount: 290000,
          currency: 'NGN',
          status: 'success',
          metadata: {
            subscription_id: 'sub-123',
          },
        },
      }

      // Simulate concurrent webhook processing
      const request1 = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: { 'x-paystack-signature': 'valid-signature' },
      })

      const request2 = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: { 'x-paystack-signature': 'valid-signature' },
      })

      const { POST: processWebhook } = await import('@/app/api/billing/webhook/route')
      
      const [response1, response2] = await Promise.all([
        processWebhook(request1),
        processWebhook(request2),
      ])

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(activateSubscription).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Consistency Checks', () => {
    it('should maintain referential integrity between subscriptions and payments', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'active',
        plan: mockPlan,
        payments: [
          {
            id: 'payment-1',
            subscriptionId: 'sub-123',
            status: 'succeeded',
            amount: 29,
          },
          {
            id: 'payment-2',
            subscriptionId: 'sub-123',
            status: 'succeeded',
            amount: 29,
          },
        ],
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'GET',
      })

      const { GET: getSubscription } = await import('@/app/api/billing/subscription/route')
      const response = await getSubscription(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription.payments).toHaveLength(2)
      expect(data.subscription.payments.every((p: any) => p.subscriptionId === 'sub-123')).toBe(true)
    })

    it('should handle orphaned payments correctly', async () => {
      // Test the recovery system's ability to find and link orphaned payments
      const mockIncompleteSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'incomplete',
        plan: mockPlan,
      }

      const mockOrphanedPayments = [
        {
          id: 'payment-orphan-1',
          userId: 'user-123',
          subscriptionId: null,
          status: 'succeeded',
          amount: 29,
          currency: 'NGN',
          providerPaymentRef: 'ref-orphan-1',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
        {
          id: 'payment-orphan-2',
          userId: 'user-123',
          subscriptionId: null,
          status: 'succeeded',
          amount: 29,
          currency: 'NGN',
          providerPaymentRef: 'ref-orphan-2',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago (more recent)
        },
      ]

      const mockActivationResult = {
        result: { success: true, reason: 'activated' },
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockIncompleteSubscription as any)
      vi.mocked(prisma.payment.findMany).mockResolvedValue(mockOrphanedPayments as any)
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(activateSubscription).mockResolvedValue(mockActivationResult as any)

      const recoveryRequest = new NextRequest('http://localhost:3000/api/billing/subscription/recover', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId: 'sub-123' }),
      })

      const { POST: recoverSubscription } = await import('@/app/api/billing/subscription/recover/route')
      const recoveryResponse = await recoverSubscription(recoveryRequest)
      const recoveryData = await recoveryResponse.json()

      expect(recoveryResponse.status).toBe(200)
      expect(recoveryData.recovery.success).toBe(true)
      
      // Should link the most recent orphaned payment
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-orphan-2' }, // Most recent one
        data: { subscriptionId: 'sub-123' },
      })
    })
  })
})