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
      // Try to recover by:
      // 1. Finding unlinked successful payments
      // 2. Finding pending payments that might have succeeded in Paystack
      const recentPayments = await prisma.payment.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { status: PAYMENT_STATUS.SUCCEEDED, subscriptionId: null },
            { status: PAYMENT_STATUS.PENDING },
            { status: PAYMENT_STATUS.PROCESSING }
          ],
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentPayments.length > 0) {
        const { getPaystack } = await import('@/lib/billing')
        const paystack = await getPaystack()

        for (const payment of recentPayments) {
          try {
            // Verify payment with Paystack
            const verification = await (paystack as any).transaction.verify(payment.providerPaymentRef)

            if (verification.status && verification.data.status === 'success') {
              // Update payment and activate (existing logic)
              await prisma.payment.update({
                where: { id: payment.id },
                data: {
                  subscriptionId: subscription.id,
                  status: PAYMENT_STATUS.SUCCEEDED,
                  providerPaymentId: verification.data.id?.toString(),
                  providerResponse: JSON.stringify(verification.data)
                }
              })

              const result = await activateSubscription({
                subscriptionId: subscription.id,
                paymentData: {
                  reference: payment.providerPaymentRef,
                  paymentId: verification.data.id?.toString() || '',
                  amount: verification.data.amount || payment.amount * 100,
                  currency: verification.data.currency || payment.currency,
                  authorization: verification.data.authorization
                },
                source: 'manual_recovery'
              })

              if (result.result.success) {
                recoveryResult = {
                  success: true,
                  method: 'stuck_payment_recovery',
                  message: `Subscription recovered by verifying previously ${payment.status} payment`,
                  paymentId: payment.id
                }
                break
              }
            }
          } catch (error) {
            console.error(`Error verifying payment ${payment.providerPaymentRef}:`, error)
          }
        }
      }

      // DEEP SEARCH: If still not recovered, search Paystack directly for ANY successful transactions for this user
      if (!recoveryResult) {
        console.log("Starting Paystack Deep Search for user email:", session.user.email)
        try {
          const { getPaystack } = await import('@/lib/billing')
          const paystack = await getPaystack()

          // 1. Get transactions for this customer email
          const paystackTx = await (paystack as any).transaction.list({
            customer: session.user.email,
            status: 'success'
          })

          if (paystackTx.status && paystackTx.data && paystackTx.data.length > 0) {
            console.log(`Found ${paystackTx.data.length} successful transactions on Paystack for email ${session.user.email}`)

            for (const tx of paystackTx.data) {
              // Check if we already have this payment in our DB
              const txId = tx.id.toString()
              const existingPayment = await prisma.payment.findFirst({
                where: { providerPaymentId: txId }
              })

              if (existingPayment) {
                // If it's already in our DB and linked to this subscription, we might just need to sync status
                if (existingPayment.subscriptionId === subscription.id && subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
                  const result = await activateSubscription({
                    subscriptionId: subscription.id,
                    paymentData: {
                      reference: tx.reference,
                      paymentId: txId,
                      amount: tx.amount,
                      currency: tx.currency,
                      authorization: tx.authorization
                    },
                    source: 'manual_recovery'
                  })

                  if (result.result.success) {
                    recoveryResult = {
                      success: true,
                      method: 'deep_search_sync',
                      message: 'Subscription successfully synced from existing Paystack transaction'
                    }
                    break
                  }
                }
                continue // Already processed
              }

              // This is a "new" successful payment we don't have linked yet
              // Try to find if it matches any of our PENDING payments by amount
              const matchingPending = await prisma.payment.findFirst({
                where: {
                  userId: session.user.id,
                  status: PAYMENT_STATUS.PENDING,
                  amount: (tx.amount || 0) / 100
                }
              })

              if (matchingPending) {
                console.log("Matched Paystack transaction with local pending payment:", matchingPending.id)
                await prisma.payment.update({
                  where: { id: matchingPending.id },
                  data: {
                    status: PAYMENT_STATUS.SUCCEEDED,
                    subscriptionId: subscription.id,
                    providerPaymentId: txId,
                    providerPaymentRef: tx.reference,
                    providerResponse: JSON.stringify(tx)
                  }
                })
              } else {
                // Create a new payment record for this untracked successful payment
                console.log("Creating new payment record for untracked Paystack transaction:", tx.reference)
                await prisma.payment.create({
                  data: {
                    userId: session.user.id,
                    subscriptionId: subscription.id,
                    amount: (tx.amount || 0) / 100,
                    currency: tx.currency,
                    status: PAYMENT_STATUS.SUCCEEDED,
                    providerPaymentId: txId,
                    providerPaymentRef: tx.reference,
                    providerResponse: JSON.stringify(tx),
                    description: `Deep recovery: ${tx.reference}`
                  }
                })
              }

              // Activate/Sync the subscription
              const result = await activateSubscription({
                subscriptionId: subscription.id,
                paymentData: {
                  reference: tx.reference,
                  paymentId: txId,
                  amount: tx.amount,
                  currency: tx.currency,
                  authorization: tx.authorization
                },
                source: 'manual_recovery'
              })

              if (result.result.success) {
                recoveryResult = {
                  success: true,
                  method: 'deep_search_recovery',
                  message: 'Subscription recovered via Paystack transaction history search'
                }
                break
              }
            }
          }
        } catch (error) {
          console.error("Deep search failed:", error)
        }
      }

      if (!recoveryResult) {
        recoveryResult = {
          success: false,
          method: 'search',
          message: recentPayments.length > 0
            ? `Found ${recentPayments.length} candidate payments locally, but none matched successful Paystack transactions.`
            : 'No successful transactions found for your account on Paystack in the last 30 days.'
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