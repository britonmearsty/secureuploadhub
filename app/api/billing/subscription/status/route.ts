import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from "@/lib/billing-constants"
import { getPaystackSubscription } from "@/lib/paystack-subscription"

export const dynamic = 'force-dynamic'

/**
 * Check and update subscription status by verifying with Paystack
 * This endpoint can be used as a fallback when webhooks fail
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
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    let updated = false
    let statusMessage = "Subscription status is up to date"

    // If subscription is incomplete, check if there's a recent successful payment
    if (subscription.status === "incomplete") {
      const recentSuccessfulPayment = await prisma.payment.findFirst({
        where: {
          subscriptionId: subscription.id,
          status: PAYMENT_STATUS.SUCCEEDED,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      if (recentSuccessfulPayment) {
        // Payment succeeded but subscription is still incomplete - update it
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
              reason: "Manual status sync - payment found",
            }
          })
        })

        updated = true
        statusMessage = "Subscription activated - payment was successful"
      }
    }

    // If subscription has a Paystack subscription ID, verify status with Paystack
    if (subscription.providerSubscriptionId && !updated) {
      try {
        const paystackSub = await getPaystackSubscription(subscription.providerSubscriptionId)
        
        if (paystackSub) {
          let shouldUpdate = false
          let newStatus = subscription.status

          // Map Paystack status to internal status
          if (paystackSub.status === "active" && subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
            newStatus = SUBSCRIPTION_STATUS.ACTIVE
            shouldUpdate = true
          } else if (paystackSub.status === "cancelled" && subscription.status !== SUBSCRIPTION_STATUS.CANCELED) {
            newStatus = SUBSCRIPTION_STATUS.CANCELED
            shouldUpdate = true
          }

          if (shouldUpdate) {
            const now = new Date()
            const nextPaymentDate = paystackSub.next_payment_date ? new Date(paystackSub.next_payment_date) : null

            await prisma.$transaction(async (tx) => {
              await tx.subscription.update({
                where: { id: subscription.id },
                data: {
                  status: newStatus,
                  ...(nextPaymentDate && { nextBillingDate: nextPaymentDate }),
                  ...(newStatus === SUBSCRIPTION_STATUS.ACTIVE && {
                    retryCount: 0,
                    gracePeriodEnd: null,
                    lastPaymentAttempt: now,
                  })
                }
              })

              await tx.subscriptionHistory.create({
                data: {
                  subscriptionId: subscription.id,
                  action: "status_changed",
                  oldValue: JSON.stringify({ status: subscription.status }),
                  newValue: JSON.stringify({ status: newStatus }),
                  reason: "Manual status sync with Paystack",
                }
              })
            })

            updated = true
            statusMessage = `Subscription status updated to ${newStatus} based on Paystack`
          }
        }
      } catch (error) {
        console.error("Error checking Paystack subscription:", error)
        // Don't fail the request if Paystack check fails
      }
    }

    // Fetch updated subscription
    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    })

    return NextResponse.json({
      subscription: updatedSubscription,
      updated,
      message: statusMessage
    })

  } catch (error) {
    console.error("Error checking subscription status:", error)
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 }
    )
  }
}