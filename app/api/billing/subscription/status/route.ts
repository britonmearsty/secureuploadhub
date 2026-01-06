import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getPaystackSubscription } from "@/lib/paystack-subscription"
import { SUBSCRIPTION_STATUS, mapPaystackSubscriptionStatus } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"

export const dynamic = 'force-dynamic'

/**
 * Check and update subscription status from Paystack
 * This endpoint can be called to manually sync subscription status
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["incomplete", "active", "past_due"] }
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription) {
      return NextResponse.json({ 
        error: "No subscription found" 
      }, { status: 404 })
    }

    let updated = false
    let message = "Subscription status is up to date"

    // If subscription is incomplete, check for recent successful payments
    if (subscription.status === 'incomplete') {
      const recentPayment = await prisma.payment.findFirst({
        where: {
          subscriptionId: subscription.id,
          status: 'succeeded',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentPayment) {
        // Activate subscription based on successful payment
        const now = new Date()
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SUBSCRIPTION_STATUS.ACTIVE,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              nextBillingDate: periodEnd,
              cancelAtPeriodEnd: false,
              retryCount: 0,
              gracePeriodEnd: null,
              lastPaymentAttempt: now,
            }
          })

          await tx.subscriptionHistory.create({
            data: {
              subscriptionId: subscription.id,
              action: "activated",
              oldValue: JSON.stringify({ status: subscription.status }),
              newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
              reason: "Activated based on successful payment found",
            }
          })
        })

        await createAuditLog({
          userId: session.user.id,
          action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
          resource: "subscription",
          resourceId: subscription.id,
          details: { 
            action: "manual_activation", 
            paymentId: recentPayment.id,
            previousStatus: subscription.status 
          }
        })

        updated = true
        message = "Subscription activated based on successful payment"
      }
    }

    // If subscription has Paystack subscription ID, check Paystack status
    if (subscription.providerSubscriptionId && !updated) {
      try {
        const paystackSub = await getPaystackSubscription(subscription.providerSubscriptionId)
        
        if (paystackSub) {
          const paystackStatus = mapPaystackSubscriptionStatus(paystackSub.status)
          
          if (paystackStatus !== subscription.status) {
            await prisma.$transaction(async (tx) => {
              await tx.subscription.update({
                where: { id: subscription.id },
                data: {
                  status: paystackStatus,
                  ...(paystackStatus === SUBSCRIPTION_STATUS.ACTIVE && {
                    cancelAtPeriodEnd: false,
                    retryCount: 0,
                    gracePeriodEnd: null,
                  })
                }
              })

              await tx.subscriptionHistory.create({
                data: {
                  subscriptionId: subscription.id,
                  action: "status_changed",
                  oldValue: JSON.stringify({ status: subscription.status }),
                  newValue: JSON.stringify({ status: paystackStatus }),
                  reason: "Status synced from Paystack",
                }
              })
            })

            await createAuditLog({
              userId: session.user.id,
              action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
              resource: "subscription",
              resourceId: subscription.id,
              details: { 
                action: "status_sync", 
                oldStatus: subscription.status,
                newStatus: paystackStatus,
                paystackSubscriptionId: subscription.providerSubscriptionId
              }
            })

            updated = true
            message = `Subscription status updated from ${subscription.status} to ${paystackStatus}`
          }
        }
      } catch (error) {
        console.error("Error checking Paystack subscription:", error)
        // Don't fail the request if Paystack check fails
      }
    }

    return NextResponse.json({
      updated,
      message,
      subscription: {
        id: subscription.id,
        status: updated ? (subscription.status === 'incomplete' ? SUBSCRIPTION_STATUS.ACTIVE : subscription.status) : subscription.status,
        plan: subscription.plan
      }
    })

  } catch (error) {
    console.error("Error checking subscription status:", error)
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 }
    )
  }
}

/**
 * Get current subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["incomplete", "active", "past_due", "canceled"] }
      },
      include: { 
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription) {
      return NextResponse.json({ 
        subscription: null,
        message: "No subscription found"
      })
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        lastPayment: subscription.payments[0] || null
      }
    })

  } catch (error) {
    console.error("Error fetching subscription status:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    )
  }
}