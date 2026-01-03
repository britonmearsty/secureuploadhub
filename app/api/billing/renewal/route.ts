import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getPaystackSubscription } from "@/lib/paystack-subscription"
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addMonths } from "date-fns"

export const dynamic = 'force-dynamic'

// This endpoint should be called by a cron job daily
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal call (add API key check in production)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "change-me-in-production"
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    
    // Find subscriptions that need renewal
    // - Active subscriptions with nextBillingDate <= now
    // - Not cancelled at period end
    const subscriptionsToRenew = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        cancelAtPeriodEnd: false,
        nextBillingDate: {
          lte: now
        },
        providerSubscriptionId: {
          not: null
        }
      },
      include: {
        plan: true,
        user: true
      }
    })

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const subscription of subscriptionsToRenew) {
      try {
        results.processed++

        // Get Paystack subscription to check status
        if (!subscription.providerSubscriptionId) {
          results.errors.push(`Subscription ${subscription.id} has no providerSubscriptionId`)
          continue
        }

        const paystackSub = await getPaystackSubscription(subscription.providerSubscriptionId)
        
        if (!paystackSub) {
          results.errors.push(`Paystack subscription not found for ${subscription.id}`)
          continue
        }

        // Check if payment was successful
        // Paystack automatically charges subscriptions, so we check the status
        if (paystackSub.status === "active") {
          // Payment succeeded - update subscription
          const newPeriodStart = new Date(paystackSub.next_payment_date || subscription.currentPeriodEnd)
          const newPeriodEnd = addMonths(newPeriodStart, 1)
          const newNextBilling = addMonths(newPeriodStart, 1)

          await prisma.$transaction(async (tx) => {
            // Update subscription
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                currentPeriodStart: newPeriodStart,
                currentPeriodEnd: newPeriodEnd,
                nextBillingDate: newNextBilling,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                retryCount: 0, // Reset retry count on success
                lastPaymentAttempt: now,
              }
            })

            // Create payment record (if not already created by webhook)
            const existingPayment = await tx.payment.findFirst({
              where: {
                subscriptionId: subscription.id,
                createdAt: {
                  gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
                },
                status: PAYMENT_STATUS.SUCCEEDED
              }
            })

            if (!existingPayment) {
              await tx.payment.create({
                data: {
                  subscriptionId: subscription.id,
                  userId: subscription.userId,
                  amount: subscription.plan.price,
                  currency: subscription.plan.currency,
                  status: PAYMENT_STATUS.SUCCEEDED,
                  description: `Renewal payment for ${subscription.plan.name} plan`,
                  providerPaymentRef: `renewal_${subscription.id}_${Date.now()}`,
                }
              })
            }

            // Create subscription history
            await tx.subscriptionHistory.create({
              data: {
                subscriptionId: subscription.id,
                action: "renewed",
                newValue: JSON.stringify({
                  currentPeriodStart: newPeriodStart,
                  currentPeriodEnd: newPeriodEnd,
                  nextBillingDate: newNextBilling,
                }),
                reason: "Subscription renewed successfully",
              }
            })
          })

          // Create audit log
          await createAuditLog({
            userId: subscription.userId,
            action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
            resource: "subscription",
            resourceId: subscription.id,
            details: {
              action: "renewed",
              periodStart: newPeriodStart,
              periodEnd: newPeriodEnd,
            }
          })

          results.succeeded++
        } else if (paystackSub.status === "non-renewing" || paystackSub.status === "cancelled") {
          // Subscription was cancelled
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SUBSCRIPTION_STATUS.CANCELED,
              cancelAtPeriodEnd: true,
            }
          })
        } else {
          // Payment failed or subscription inactive
          await handleFailedRenewal(subscription, now)
          results.failed++
        }
      } catch (error: any) {
        results.errors.push(`Error processing subscription ${subscription.id}: ${error.message}`)
        results.failed++
        
        // Try to handle as failed renewal
        try {
          await handleFailedRenewal(subscription, now)
        } catch (err) {
          console.error(`Failed to handle failed renewal for ${subscription.id}:`, err)
        }
      }
    }

    // Handle expired grace periods
    const expiredGracePeriods = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.PAST_DUE,
        gracePeriodEnd: {
          lte: now
        }
      },
      include: {
        plan: true,
        user: true
      }
    })

    for (const subscription of expiredGracePeriods) {
      try {
        // Cancel subscription after grace period expires
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SUBSCRIPTION_STATUS.CANCELED,
              gracePeriodEnd: null,
            }
          })

          await tx.subscriptionHistory.create({
            data: {
              subscriptionId: subscription.id,
              action: "status_changed",
              oldValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.PAST_DUE }),
              newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.CANCELED }),
              reason: "Grace period expired",
            }
          })
        })

        // Cancel Paystack subscription if exists
        if (subscription.providerSubscriptionId) {
          try {
            const { cancelPaystackSubscription } = await import("@/lib/paystack-subscription")
            await cancelPaystackSubscription(subscription.providerSubscriptionId)
          } catch (error) {
            console.error(`Failed to cancel Paystack subscription ${subscription.providerSubscriptionId}:`, error)
          }
        }
      } catch (error) {
        console.error(`Error canceling subscription ${subscription.id} after grace period:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        expiredGracePeriods: expiredGracePeriods.length
      },
      timestamp: now.toISOString()
    })
  } catch (error: any) {
    console.error("Error processing renewals:", error)
    return NextResponse.json(
      { error: "Failed to process renewals", details: error.message },
      { status: 500 }
    )
  }
}

async function handleFailedRenewal(subscription: any, now: Date) {
  const GRACE_PERIOD_DAYS = 7
  const MAX_RETRIES = 3

  const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const retryCount = (subscription.retryCount || 0) + 1

  await prisma.$transaction(async (tx) => {
    // Update subscription to past_due if not already
    const updateData: any = {
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      lastPaymentAttempt: now,
      retryCount: retryCount,
    }

    // Set grace period if first failure
    if (!subscription.gracePeriodEnd) {
      updateData.gracePeriodEnd = gracePeriodEnd
    }

    await tx.subscription.update({
      where: { id: subscription.id },
      data: updateData
    })

    // Create failed payment record
    await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        amount: subscription.plan.price,
        currency: subscription.plan.currency,
        status: PAYMENT_STATUS.FAILED,
        description: `Failed renewal payment for ${subscription.plan.name} plan (attempt ${retryCount})`,
        providerPaymentRef: `failed_renewal_${subscription.id}_${Date.now()}`,
      }
    })

    // Create subscription history
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: retryCount === 1 ? "grace_period_started" : "status_changed",
        oldValue: JSON.stringify({ status: subscription.status }),
        newValue: JSON.stringify({ 
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          gracePeriodEnd: gracePeriodEnd,
          retryCount: retryCount
        }),
        reason: `Payment failed (attempt ${retryCount}/${MAX_RETRIES})`,
      }
    })
  })

  // TODO: Send payment failure email notification
  // This should be implemented in email-templates.tsx
}

