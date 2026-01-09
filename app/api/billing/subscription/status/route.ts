import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getPaystackSubscription } from "@/lib/paystack-subscription"
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS, mapPaystackSubscriptionStatus } from "@/lib/billing-constants"
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

    // Try to parse body for specific reference
    let referenceFromClient: string | undefined
    try {
      const body = await request.json()
      referenceFromClient = body.reference
    } catch (e) {
      // Body might be empty or not JSON, that's fine
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

    // 1. If specific reference provided by client, prioritize verifying it
    if (referenceFromClient) {
      console.log(`Verifying client-provided reference: ${referenceFromClient}`)
      try {
        const { getPaystack } = await import('@/lib/billing')
        const paystack = await getPaystack()
        const verification = await (paystack as any).transaction.verify(referenceFromClient)

        if (verification.status && verification.data.status === 'success') {
          const { activateSubscription } = await import('@/lib/subscription-manager')
          const result = await activateSubscription({
            subscriptionId: subscription.id,
            paymentData: {
              reference: referenceFromClient,
              paymentId: verification.data.id?.toString() || '',
              amount: verification.data.amount, // subunits
              currency: verification.data.currency,
              authorization: verification.data.authorization
            },
            source: 'manual_verification_ref'
          })

          if (result.result.success) {
            updated = true
            message = "Payment verified and subscription activated"
          }
        }
      } catch (error) {
        console.error('Error verifying provided reference:', error)
      }
    }

    // 2. Fallback: Check for recent successful payments that aren't synced yet
    if (!updated && (subscription.status === 'incomplete' || subscription.status === 'active')) {
      const recentSucceededPayment = await prisma.payment.findFirst({
        where: {
          subscriptionId: subscription.id,
          status: PAYMENT_STATUS.SUCCEEDED,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentSucceededPayment && subscription.status === 'incomplete') {
        const { activateSubscription } = await import('@/lib/subscription-manager')
        const result = await activateSubscription({
          subscriptionId: subscription.id,
          paymentData: {
            reference: recentSucceededPayment.providerPaymentRef,
            paymentId: recentSucceededPayment.providerPaymentId || '',
            amount: recentSucceededPayment.amount * 100,
            currency: recentSucceededPayment.currency,
          },
          source: 'manual_check'
        })

        if (result.result.success) {
          updated = true
          message = "Subscription activated successfully"
        }
      }
    }

    // 3. Fallback: Check for any pending/processing payments and verify them with Paystack
    if (!updated && (subscription.status === 'incomplete' || subscription.status === 'active')) {
      const stuckPayments = await prisma.payment.findMany({
        where: {
          subscriptionId: subscription.id,
          status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })

      for (const payment of stuckPayments) {
        if (referenceFromClient && payment.providerPaymentRef === referenceFromClient) continue

        try {
          const { getPaystack } = await import('@/lib/billing')
          const paystack = await getPaystack()
          const verification = await (paystack as any).transaction.verify(payment.providerPaymentRef)

          if (verification.status && verification.data.status === 'success') {
            const { activateSubscription } = await import('@/lib/subscription-manager')
            const result = await activateSubscription({
              subscriptionId: subscription.id,
              paymentData: {
                reference: payment.providerPaymentRef,
                paymentId: verification.data.id?.toString() || '',
                amount: verification.data.amount || payment.amount * 100,
                currency: verification.data.currency || payment.currency,
                authorization: verification.data.authorization
              },
              source: 'manual_verification'
            })

            if (result.result.success) {
              updated = true
              message = "Payment verified and subscription activated successfully"
              break
            }
          }
        } catch (error) {
          console.error('Error verifying stuck payment:', error)
        }
      }
    }

    // 4. Final Fallback: If subscription has Paystack ID, sync status directly
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
      }
    }

    return NextResponse.json({
      updated,
      message,
      subscription: {
        id: subscription.id,
        status: updated ? SUBSCRIPTION_STATUS.ACTIVE : subscription.status,
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