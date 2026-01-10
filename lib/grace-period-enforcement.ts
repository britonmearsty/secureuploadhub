/**
 * Grace Period Enforcement System
 * Handles subscription cancellation after grace period expires
 */

import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addDays, isPast } from "date-fns"

export interface GracePeriodConfig {
  gracePeriodDays: number
  warningDays: number[]
  enableAutoCancel: boolean
}

export const DEFAULT_GRACE_PERIOD_CONFIG: GracePeriodConfig = {
  gracePeriodDays: 7,
  warningDays: [3, 1], // Send warnings at 3 days and 1 day before expiry
  enableAutoCancel: true
}

/**
 * Check and enforce grace periods for subscriptions
 */
export async function enforceGracePeriods(
  config: Partial<GracePeriodConfig> = {}
): Promise<{
  processed: number
  cancelled: number
  warned: number
  errors: string[]
}> {
  const finalConfig = { ...DEFAULT_GRACE_PERIOD_CONFIG, ...config }
  const now = new Date()
  const errors: string[] = []
  let processed = 0
  let cancelled = 0
  let warned = 0

  try {
    // Find subscriptions in grace period
    const gracePeriodSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.GRACE_PERIOD,
        gracePeriodEnd: {
          not: null
        }
      },
      include: {
        user: true,
        plan: true
      }
    })

    console.log(`Found ${gracePeriodSubscriptions.length} subscriptions in grace period`)

    for (const subscription of gracePeriodSubscriptions) {
      processed++
      
      try {
        if (!subscription.gracePeriodEnd) {
          console.warn(`Subscription ${subscription.id} in grace period but no end date set`)
          continue
        }

        const gracePeriodEnd = new Date(subscription.gracePeriodEnd)
        const daysUntilExpiry = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Check if grace period has expired
        if (isPast(gracePeriodEnd)) {
          if (finalConfig.enableAutoCancel) {
            await cancelExpiredSubscription(subscription.id, 'grace_period_expired')
            cancelled++
            console.log(`Cancelled subscription ${subscription.id} - grace period expired`)
          } else {
            console.log(`Grace period expired for subscription ${subscription.id} but auto-cancel disabled`)
          }
        }
        // Check if warning should be sent
        else if (finalConfig.warningDays.includes(daysUntilExpiry)) {
          await sendGracePeriodWarning(subscription.id, daysUntilExpiry)
          warned++
          console.log(`Sent grace period warning for subscription ${subscription.id} - ${daysUntilExpiry} days remaining`)
        }

      } catch (error) {
        const errorMsg = `Failed to process subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

  } catch (error) {
    const errorMsg = `Grace period enforcement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    console.error(errorMsg)
  }

  return {
    processed,
    cancelled,
    warned,
    errors
  }
}

/**
 * Cancel a subscription that has exceeded its grace period
 */
async function cancelExpiredSubscription(
  subscriptionId: string,
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update subscription status
    const subscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SUBSCRIPTION_STATUS.CANCELED,
        gracePeriodEnd: null
      },
      include: { user: true }
    })

    // Create audit log
    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      resource: 'subscription',
      resourceId: subscriptionId,
      details: {
        subscriptionId,
        reason,
        cancelledBy: 'system',
        gracePeriodExpired: true
      }
    })

    console.log(`Subscription ${subscriptionId} cancelled due to ${reason}`)
  })
}

/**
 * Send grace period warning (placeholder - implement with your notification system)
 */
async function sendGracePeriodWarning(
  subscriptionId: string,
  daysRemaining: number
): Promise<void> {
  // This is a placeholder - implement with your actual notification system
  // You might want to:
  // 1. Send email notification
  // 2. Create in-app notification
  // 3. Log to audit system
  
  await createAuditLog({
    userId: 'system',
    action: AUDIT_ACTIONS.NOTIFICATION_SENT,
    resource: 'subscription',
    resourceId: subscriptionId,
    details: {
      type: 'grace_period_warning',
      subscriptionId,
      daysRemaining,
      sentAt: new Date()
    }
  })

  console.log(`Grace period warning sent for subscription ${subscriptionId} - ${daysRemaining} days remaining`)
}

/**
 * Set grace period for a subscription
 */
export async function setGracePeriod(
  subscriptionId: string,
  gracePeriodDays: number = 7
): Promise<void> {
  const gracePeriodEnd = addDays(new Date(), gracePeriodDays)

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: SUBSCRIPTION_STATUS.GRACE_PERIOD,
      gracePeriodEnd
    }
  })

  await createAuditLog({
    userId: 'system',
    action: AUDIT_ACTIONS.SUBSCRIPTION_GRACE_PERIOD_SET,
    resource: 'subscription',
    resourceId: subscriptionId,
    details: {
      subscriptionId,
      gracePeriodDays,
      gracePeriodEnd
    }
  })

  console.log(`Grace period set for subscription ${subscriptionId} until ${gracePeriodEnd}`)
}

/**
 * Get subscriptions approaching grace period expiry
 */
export async function getExpiringGracePeriods(
  daysAhead: number = 3
): Promise<Array<{
  subscriptionId: string
  userEmail: string
  planName: string
  daysRemaining: number
  gracePeriodEnd: Date
}>> {
  const cutoffDate = addDays(new Date(), daysAhead)

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: SUBSCRIPTION_STATUS.GRACE_PERIOD,
      gracePeriodEnd: {
        not: null,
        lte: cutoffDate
      }
    },
    include: {
      user: true,
      plan: true
    }
  })

  return subscriptions.map(sub => ({
    subscriptionId: sub.id,
    userEmail: sub.user.email,
    planName: sub.plan.name,
    daysRemaining: Math.ceil((new Date(sub.gracePeriodEnd!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    gracePeriodEnd: new Date(sub.gracePeriodEnd!)
  }))
}