import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    subscriptionHistory: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/distributed-lock', () => {
  return {
    DistributedLock: vi.fn().mockImplementation(function () {
      return {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
        extend: vi.fn().mockResolvedValue(true),
      }
    }),
  }
})

vi.mock('@/lib/idempotency', () => ({
  withIdempotency: vi.fn(),
}))

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  AUDIT_ACTIONS: {
    SUBSCRIPTION_ACTIVATED: 'subscription_activated',
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    SUBSCRIPTION_UPDATED: 'subscription_updated',
  },
}))

vi.mock('@/lib/billing-constants', () => ({
  SUBSCRIPTION_STATUS: {
    ACTIVE: 'active',
    INCOMPLETE: 'incomplete',
    PAST_DUE: 'past_due',
    CANCELLED: 'cancelled',
    CANCELED: 'cancelled',
  },
  PAYMENT_STATUS: {
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    PENDING: 'pending',
  },
}))

vi.mock('@/lib/paystack-subscription', () => ({
  createPaystackSubscription: vi.fn(),
}))

vi.mock('date-fns', () => ({
  addMonths: vi.fn((date, months) => new Date(date.getTime() + months * 30 * 24 * 60 * 60 * 1000)),
}))

import prisma from '@/lib/prisma'
import { DistributedLock } from '@/lib/distributed-lock'
import { withIdempotency } from '@/lib/idempotency'
import { createPaystackSubscription } from '@/lib/paystack-subscription'

describe('Subscription Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('activateSubscription', () => {
    const mockSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      status: 'incomplete',
      providerSubscriptionId: null,
      plan: {
        id: 'plan-pro',
        name: 'Pro Plan',
        currency: 'NGN',
      },
      user: {
        id: 'user-123',
        email: 'user@example.com',
      },
    }

    const mockActivationParams = {
      subscriptionId: 'sub-123',
      paymentData: {
        reference: 'ref-123',
        paymentId: 'charge-123',
        amount: 290000,
        currency: 'NGN',
        authorization: {
          authorization_code: 'auth-code-123',
        },
      },
      source: 'webhook' as const,
    }

    it('should successfully activate subscription with distributed locking', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({ status: 'incomplete' }),
            update: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'active' }),
          },
          payment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: 'payment-123',
              subscriptionId: 'sub-123',
              status: 'succeeded',
            }),
          },
          subscriptionHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        } as any)
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.isNew).toBe(true)
      expect(result.result.success).toBe(true)
      expect(mockLock.acquire).toHaveBeenCalledWith(30000)
      expect(mockLock.release).toHaveBeenCalled()
      expect(withIdempotency).toHaveBeenCalledWith(
        'activate_subscription:sub-123:ref-123',
        expect.any(Function),
        { ttlSeconds: 300 }
      )
    })

    it('should handle lock acquisition failure', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(false),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.isNew).toBe(false)
      expect(result.result.success).toBe(false)
      expect(result.result.reason).toBe('lock_timeout')
      expect(mockLock.acquire).toHaveBeenCalled()
      expect(mockLock.release).toHaveBeenCalled()
    })

    it('should skip activation if subscription is already active', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      const activeSubscription = { ...mockSubscription, status: 'active' }

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(activeSubscription as any)

      const { activateSubscription } = await import('@/lib/subscription-manager')
      // Providing no authorization code so it skips linking too
      const result = await activateSubscription({
        ...mockActivationParams,
        paymentData: { ...mockActivationParams.paymentData, authorization: undefined }
      })

      expect(result.result.success).toBe(true)
      expect(result.result.reason).toBe('already_active')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('should handle subscription not found', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(false)
      expect(result.result.reason).toBe('subscription_not_found')
    })

    it('should handle invalid subscription status', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      const cancelledSubscription = { ...mockSubscription, status: 'cancelled' }

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(cancelledSubscription as any)

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(false)
      expect(result.result.reason).toBe('invalid_status')
      expect(result.result.currentStatus).toBe('cancelled')
    })

    it('should create payment record when none exists', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)

      const mockTransactionPrisma = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ status: 'incomplete' }),
          update: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'active' }),
        },
        subscriptionHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        payment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 'payment-new',
            subscriptionId: 'sub-123',
            amount: 2900,
            currency: 'NGN',
            status: 'succeeded',
          }),
        },
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTransactionPrisma as any)
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(true)
      expect(mockTransactionPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          subscriptionId: 'sub-123',
          userId: 'user-123',
          amount: 2900, // Converted from kobo
          currency: 'NGN',
          status: 'succeeded',
          providerPaymentId: 'charge-123',
          providerPaymentRef: 'ref-123',
          description: 'Initial payment for Pro Plan',
          authorizationCode: 'auth-code-123',
        },
      })
    })

    it('should update existing payment when found', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)

      const existingPayment = {
        id: 'payment-existing',
        status: 'pending',
      }

      const mockTransactionPrisma = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ status: 'incomplete' }),
          update: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'active' }),
        },
        subscriptionHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        payment: {
          findFirst: vi.fn().mockResolvedValue(existingPayment),
          update: vi.fn().mockResolvedValue({
            ...existingPayment,
            status: 'succeeded',
          }),
        },
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTransactionPrisma as any)
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(true)
      expect(mockTransactionPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-existing' },
        data: {
          status: 'succeeded',
          providerPaymentId: 'charge-123',
          authorizationCode: 'auth-code-123',
        },
      })
    })

    it('should create Paystack subscription when authorization code is provided', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        providerSubscriptionId: null,
      } as any)

      vi.mocked(createPaystackSubscription).mockResolvedValue('paystack-sub-123')

      const mockTransactionPrisma = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ status: 'incomplete' }),
          update: vi.fn().mockResolvedValue({
            ...mockSubscription,
            status: 'active',
            providerSubscriptionId: 'paystack-sub-123',
          }),
        },
        subscriptionHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        payment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTransactionPrisma as any)
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(true)
      expect(createPaystackSubscription).toHaveBeenCalled()
      expect(mockTransactionPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerSubscriptionId: 'paystack-sub-123',
          }),
        })
      )
    })

    it('should handle Paystack subscription creation failure gracefully', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        providerSubscriptionId: null,
      } as any)

      vi.mocked(createPaystackSubscription).mockRejectedValue(new Error('Paystack API error'))

      const mockTransactionPrisma = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ status: 'incomplete' }),
          update: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'active' }),
        },
        subscriptionHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        payment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTransactionPrisma as any)
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      // Should still succeed even if Paystack subscription creation fails
      expect(result.result.success).toBe(true)
      expect(mockTransactionPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            providerSubscriptionId: expect.any(String),
          }),
        })
      )
    })

    it('should handle race condition during activation', async () => {
      const mockLock = {
        acquire: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(DistributedLock).mockImplementation(function () { return mockLock as any })

      vi.mocked(withIdempotency).mockImplementation(async (key: string, fn: () => Promise<any>) => {
        return { isNew: true, result: await fn(), fromCache: false }
      })

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any)

      // Simulate status change during transaction to something invalid
      const mockTransactionPrisma = {
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ status: 'cancelled' }), // Invalid status for activation
        },
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        try {
          return await callback(mockTransactionPrisma as any)
        } catch (error) {
          throw error
        }
      })

      const { activateSubscription } = await import('@/lib/subscription-manager')
      const result = await activateSubscription(mockActivationParams)

      expect(result.result.success).toBe(false)
      expect(result.result.reason).toBe('activation_failed')
      expect(result.result.error).toContain('Subscription status changed during activation: cancelled')
    })
  })

  describe('cancelSubscription', () => {
    const mockActiveSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      providerSubscriptionId: 'paystack-sub-123',
    }

    it('should cancel active subscription at period end', async () => {
      const mockTxSubscriptionUpdate = vi.fn().mockResolvedValue({
        ...mockActiveSubscription,
        cancelAtPeriodEnd: true,
      })

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockActiveSubscription as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          subscription: {
            update: mockTxSubscriptionUpdate,
          },
          subscriptionHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        } as any)
      })

      const { cancelSubscription } = await import('@/lib/subscription-manager')
      const result = await cancelSubscription('user-123')

      expect(result.success).toBe(true)
      expect(result.subscription.cancelAtPeriodEnd).toBe(true)
      expect(result.message).toContain('cancelled at the end of the current period')
      expect(mockTxSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { cancelAtPeriodEnd: true },
      })
    })

    it('should immediately cancel incomplete subscription', async () => {
      const incompleteSubscription = {
        ...mockActiveSubscription,
        status: 'incomplete',
      }

      const mockTxSubscriptionUpdate = vi.fn().mockResolvedValue({
        ...incompleteSubscription,
        status: 'cancelled',
      })

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(incompleteSubscription as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          subscription: {
            update: mockTxSubscriptionUpdate,
          },
          subscriptionHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        } as any)
      })

      const { cancelSubscription } = await import('@/lib/subscription-manager')
      const result = await cancelSubscription('user-123')

      expect(result.success).toBe(true)
      expect(result.subscription.status).toBe('cancelled')
      expect(result.message).toContain('cancelled immediately')
      expect(mockTxSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { status: 'cancelled', cancelAtPeriodEnd: false },
      })
    })

    it('should handle no subscription found', async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)

      const { cancelSubscription } = await import('@/lib/subscription-manager')
      const result = await cancelSubscription('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active subscription found')
    })

    it('should handle already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockActiveSubscription,
        status: 'cancelled',
      }

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(cancelledSubscription as any)

      const { cancelSubscription } = await import('@/lib/subscription-manager')
      const result = await cancelSubscription('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Subscription cannot be cancelled in current state: cancelled')
    })

    it('should handle database errors during cancellation', async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockActiveSubscription as any)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const { cancelSubscription } = await import('@/lib/subscription-manager')
      const result = await cancelSubscription('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to cancel subscription')
    })
  })
})