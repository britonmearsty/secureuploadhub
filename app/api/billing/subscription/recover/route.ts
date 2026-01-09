import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { activateSubscription } from "@/lib/subscription-manager"
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from "@/lib/billing-constants"

export const dynamic = 'force-dynamic'

/**
 * Manual subscription recovery endpoint
 * This endpoint helps recover stuck subscriptions by finding and linking successful payments
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId, paymentReference } = await request.json()

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId || undefined,
        userId: session.user.id,
        status: { in: [SUBSCRIPTION_STATUS.INCOMPLETE, SUBSCRIPTION_STATUS.ACTIVE] }
      },
      include: { plan: true }
    })

    if (!subscription) {
      return NextResponse.json({
        error: "No incomplete subscription found for this user"
      }, { status: 404 })
    }

    let recoveryResult = null

    if (paymentReference) {
      // Try to recover using specific payment reference
      try {
        const { getPaystack } = await import('@/lib/billing')
        const paystack = await getPaystack()
        const verification = await (paystack as any).transaction.verify(paymentReference)

        if (verification.status && verification.data.status === 'success') {
          // Create or update payment record
          const existingPayment = await prisma.payment.findFirst({
            where: { providerPaymentRef: paymentReference }
          })

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                subscriptionId: subscription.id,
                userId: session.user.id,
                amount: (verification.data.amount || 0) / 100,
                currency: verification.data.currency || subscription.plan.currency,
                status: PAYMENT_STATUS.SUCCEEDED,
                description: `Recovery payment for ${subscription.plan.name}`,
                providerPaymentId: verification.data.id?.toString(),
                providerPaymentRef: paymentReference,
              }
            })
          } else if (existingPayment.status !== PAYMENT_STATUS.SUCCEEDED) {
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                status: PAYMENT_STATUS.SUCCEEDED,
                subscriptionId: subscription.id,
                providerPaymentId: verification.data.id?.toString(),
              }
            })
          }

          // Activate subscription
          const result = await activateSubscription({
            subscriptionId: subscription.id,
            paymentData: {
              reference: paymentReference,
              paymentId: verification.data.id?.toString() || '',
              amount: verification.data.amount || 0,
              currency: verification.data.currency || subscription.plan.currency,
              authorization: verification.data.authorization
            },
            source: 'manual_recovery'
          })

          if (result.result.success) {
            recoveryResult = {
              success: true,
              method: 'payment_reference',
              message: 'Subscription recovered successfully using payment reference'
            }
          } else {
            recoveryResult = {
              success: false,
              method: 'payment_reference',
              message: `Failed to activate subscription: ${result.result.reason}`
            }
          }
        } else {
          recoveryResult = {
            success: false,
            method: 'payment_reference',
            message: 'Payment reference verification failed or payment was not successful'
          }
        }
      } catch (error) {
        console.error('Error verifying payment reference:', error)
        recoveryResult = {
          success: false,
          method: 'payment_reference',
          message: 'Error verifying payment with Paystack'
        }
      }
    } else {
      // Try to recover by finding any successful payments for this user
      const recentSuccessfulPayments = await prisma.payment.findMany({
        where: {
          userId: session.user.id,
          status: PAYMENT_STATUS.SUCCEEDED,
          subscriptionId: null, // Unlinked payments
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentSuccessfulPayments.length > 0) {
        // Try to link the most recent payment
        const payment = recentSuccessfulPayments[0]

        // Update payment to link with subscription
        await prisma.payment.update({
          where: { id: payment.id },
          data: { subscriptionId: subscription.id }
        })

        // Activate subscription
        const result = await activateSubscription({
          subscriptionId: subscription.id,
          paymentData: {
            reference: payment.providerPaymentRef,
            paymentId: payment.providerPaymentId || '',
            amount: payment.amount * 100, // Convert to kobo
            currency: payment.currency,
          },
          source: 'manual_recovery'
        })

        if (result.result.success) {
          recoveryResult = {
            success: true,
            method: 'unlinked_payment',
            message: 'Subscription recovered by linking unlinked successful payment',
            paymentId: payment.id
          }
        } else {
          recoveryResult = {
            success: false,
            method: 'unlinked_payment',
            message: `Found payment but failed to activate subscription: ${result.result.reason}`
          }
        }
      } else {
        recoveryResult = {
          success: false,
          method: 'search',
          message: 'No unlinked successful payments found for this user in the last 30 days'
        }
      }
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: recoveryResult.success ? SUBSCRIPTION_STATUS.ACTIVE : subscription.status,
        plan: subscription.plan
      },
      recovery: recoveryResult
    })

  } catch (error) {
    console.error("Error recovering subscription:", error)
    return NextResponse.json(
      { error: "Failed to recover subscription" },
      { status: 500 }
    )
  }
}