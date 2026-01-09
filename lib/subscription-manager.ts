/**
 * Centralized Subscription Management System
 * Prevents race conditions and ensures consistent subscription state
 */

import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addMonths } from "date-fns"
import { DistributedLock } from "@/lib/distributed-lock"
import { withIdempotency } from "@/lib/idempotency"

export interface ActivateSubscriptionParams {
  subscriptionId: string
  paymentData: {
    reference: string | null
    paymentId: string
    amount: number
    currency: string
    authorization?: {
      authorization_code: string
    }
  }
  source: 'webhook' | 'verification' | 'manual' | 'manual_check' | 'manual_verification' | 'manual_verification_ref' | 'manual_recovery' | 'deep_recovery_sync' | 'deep_search_recovery'
}

/**
 * Safely activate a subscription with proper locking and idempotency
 */
export async function activateSubscription(params: ActivateSubscriptionParams) {
  const { subscriptionId, paymentData, source } = params
  const lockKey = `subscription:activate:${subscriptionId}`
  const idempotencyKey = `activate_subscription:${subscriptionId}:${paymentData.reference}`

  // Use distributed lock to prevent concurrent activation
  const lock = new DistributedLock(lockKey)

  try {
    const acquired = await lock.acquire(30000) // 30 second timeout
    if (!acquired) {
      console.log(`Failed to acquire lock for subscription activation: ${subscriptionId}`)
      return {
        isNew: false,
        result: { success: false, reason: 'lock_timeout' },
        fromCache: false
      }
    }

    // Use idempotency to prevent duplicate processing
    return await withIdempotency(idempotencyKey, async () => {
      return await _activateSubscriptionInternal(params)
    }, { ttlSeconds: 300 }) // 5 minute cache

  } finally {
    await lock.release()
  }
}

async function _activateSubscriptionInternal(params: ActivateSubscriptionParams) {
  const { subscriptionId, paymentData, source } = params
  const { reference, paymentId, amount, currency, authorization } = paymentData

  console.log(`Activating subscription ${subscriptionId} from ${source}`, {
    reference,
    paymentId,
    amount
  })

  // Get subscription with current state
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, user: true }
  })

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`)
    return { success: false, reason: 'subscription_not_found' }
  }

  // Check if already active
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
    console.log(`Subscription ${subscriptionId} already active, skipping activation`)
    return { success: true, reason: 'already_active', subscription }
  }

  // Only activate incomplete subscriptions
  if (subscription.status !== SUBSCRIPTION_STATUS.INCOMPLETE) {
    console.log(`Subscription ${subscriptionId} status is ${subscription.status}, cannot activate`)
    return { success: false, reason: 'invalid_status', currentStatus: subscription.status }
  }

  const now = new Date()
  const periodEnd = addMonths(now, 1)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Double-check status within transaction to prevent race conditions
      const currentSub = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        select: { status: true }
      })

      if (!currentSub || currentSub.status !== SUBSCRIPTION_STATUS.INCOMPLETE) {
        throw new Error(`Subscription status changed during activation: ${currentSub?.status}`)
      }

      // Check if payment already exists
      let payment = await tx.payment.findFirst({
        where: { providerPaymentRef: reference || undefined }
      })

      if (!payment) {
        // Create payment record
        payment = await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            amount: amount / 100, // Convert from kobo to naira
            currency: currency || subscription.plan.currency,
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId: paymentId,
            providerPaymentRef: reference || `manual_${subscription.id}_${Date.now()}`,
            description: `Initial payment for ${subscription.plan.name}`,
            ...(authorization?.authorization_code && {
              authorizationCode: authorization.authorization_code
            }),
          }
        })
      } else if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
        // Update existing payment to succeeded
        payment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId: paymentId,
            ...(authorization?.authorization_code && {
              authorizationCode: authorization.authorization_code
            }),
          }
        })
      }

      // Create Paystack subscription if we have authorization
      let providerSubscriptionId = subscription.providerSubscriptionId

      if (authorization?.authorization_code && !providerSubscriptionId) {
        try {
          providerSubscriptionId = await createPaystackSubscription(subscription, authorization.authorization_code)
        } catch (error) {
          console.error("Failed to create Paystack subscription:", error)
          // Continue with activation even if Paystack subscription creation fails
        }
      }

      // Activate subscription
      const activatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          ...(providerSubscriptionId && { providerSubscriptionId }),
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          cancelAtPeriodEnd: false,
          retryCount: 0,
          gracePeriodEnd: null,
          lastPaymentAttempt: now,
        }
      })

      // Create subscription history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "activated",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({
            status: SUBSCRIPTION_STATUS.ACTIVE,
            ...(providerSubscriptionId && { providerSubscriptionId }),
          }),
          reason: `Subscription activated from ${source}`,
        }
      })

      return { subscription: activatedSubscription, payment }
    })

    // Create audit log outside transaction
    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      resourceId: subscription.id,
      details: {
        action: "activated",
        source,
        reference,
        previousStatus: subscription.status
      }
    })

    console.log(`Successfully activated subscription ${subscriptionId}`)
    return { success: true, ...result }

  } catch (error) {
    console.error(`Failed to activate subscription ${subscriptionId}:`, error)
    return { success: false, reason: 'activation_failed', error: error instanceof Error ? error.message : String(error) }
  }
}

async function createPaystackSubscription(subscription: any, authorizationCode: string): Promise<string | null> {
  try {
    const { createPaystackSubscription, getOrCreatePaystackPlan } = await import('@/lib/paystack-subscription')
    const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')

    const paystackCurrency = getPaystackCurrency(subscription.plan.currency)
    const paystackPlan = await getOrCreatePaystackPlan({
      name: subscription.plan.name,
      amount: convertToPaystackSubunit(subscription.plan.price, paystackCurrency),
      interval: "monthly",
      currency: paystackCurrency,
      description: subscription.plan.description || undefined,
    })

    const paystackSubscription = await createPaystackSubscription({
      customer: subscription.providerCustomerId!,
      plan: paystackPlan.plan_code,
      authorization: authorizationCode,
    })

    return paystackSubscription.subscription_code
  } catch (error) {
    console.error("Error creating Paystack subscription:", error)
    return null
  }
}

/**
 * Safely cancel a subscription with proper validation
 */
export async function cancelSubscription(userId: string) {
  const lockKey = `subscription:cancel:${userId}`
  const lock = new DistributedLock(lockKey)

  try {
    const acquired = await lock.acquire(30000)
    if (!acquired) {
      throw new Error('Failed to acquire lock for subscription cancellation')
    }

    // Find subscription (allow cancelling incomplete, active, or past_due subscriptions)
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SUBSCRIPTION_STATUS.INCOMPLETE, SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.PAST_DUE] }
      },
      include: { plan: true }
    })

    if (!subscription) {
      throw new Error('No active subscription found')
    }

    // Handle incomplete subscriptions differently
    if (subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
      // For incomplete subscriptions, cancel immediately
      const result = await prisma.$transaction(async (tx) => {
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false, // Cancel immediately for incomplete subscriptions
          }
        })

        await tx.subscriptionHistory.create({
          data: {
            subscriptionId: subscription.id,
            action: "cancelled",
            oldValue: JSON.stringify({ status: subscription.status }),
            newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.CANCELED }),
            reason: "User cancelled incomplete subscription",
          }
        })

        return updatedSubscription
      })

      // Create audit log
      await createAuditLog({
        userId,
        action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
        resource: "subscription",
        resourceId: subscription.id,
        details: { action: "cancelled_incomplete", immediateCancel: true }
      })

      return result
    }

    // For active/past_due subscriptions, cancel Paystack subscription if exists
    if (subscription.providerSubscriptionId) {
      try {
        const { cancelPaystackSubscription } = await import("@/lib/paystack-subscription")
        await cancelPaystackSubscription(subscription.providerSubscriptionId)
      } catch (error) {
        console.error("Error canceling Paystack subscription:", error)
        // Continue with local cancellation
      }
    }

    // Update subscription to cancel at period end
    const result = await prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          // Keep status as active until period ends
        }
      })

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "cancelled",
          oldValue: JSON.stringify({ cancelAtPeriodEnd: false }),
          newValue: JSON.stringify({ cancelAtPeriodEnd: true }),
          reason: "User requested cancellation",
        }
      })

      return updatedSubscription
    })

    // Create audit log
    await createAuditLog({
      userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      resourceId: subscription.id,
      details: { action: "cancelled", cancelAtPeriodEnd: true }
    })

    return result

  } finally {
    await lock.release()
  }
}