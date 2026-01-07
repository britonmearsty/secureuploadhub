import { NextRequest, NextResponse } from 'next/server'
import { getPaystack } from '@/lib/billing'
import prisma from '@/lib/prisma'
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '@/lib/billing-constants'
import { addMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Verify payment with Paystack
    const paystack = await getPaystack()
    const verification = await (paystack as any).transaction.verify(reference)

    if (!verification.status) {
      return NextResponse.json(
        { success: false, message: 'Failed to verify payment with Paystack' },
        { status: 400 }
      )
    }

    const paystackData = verification.data

    // Find the payment record in our database
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentRef: reference },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Check if payment was successful
    if (paystackData.status === 'success') {
      // Update payment status if not already updated
      if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId: paystackData.id?.toString(),
            providerResponse: JSON.stringify(paystackData)
          }
        })
      }

      // Update subscription status if not already active
      if (payment.subscription && payment.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        const now = new Date()
        const periodEnd = addMonths(now, 1) // Use proper date calculation

        await prisma.subscription.update({
          where: { id: payment.subscription.id },
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

        // Create subscription history entry
        await prisma.subscriptionHistory.create({
          data: {
            subscriptionId: payment.subscription.id,
            action: "activated",
            oldValue: JSON.stringify({ status: payment.subscription.status }),
            newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
            reason: "Payment verified and subscription activated",
          }
        })

        console.log(`Subscription ${payment.subscription.id} activated via payment verification`)
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: PAYMENT_STATUS.SUCCEEDED
        },
        subscription: payment.subscription ? {
          id: payment.subscription.id,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          plan: payment.subscription.plan
        } : null
      })
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PAYMENT_STATUS.FAILED,
          providerResponse: JSON.stringify(paystackData)
        }
      })

      return NextResponse.json({
        success: false,
        message: 'Payment was not successful',
        payment: {
          id: payment.id,
          status: PAYMENT_STATUS.FAILED
        }
      })
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error during payment verification' },
      { status: 500 }
    )
  }
}