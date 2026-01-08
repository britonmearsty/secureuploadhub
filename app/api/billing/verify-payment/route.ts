import { NextRequest, NextResponse } from 'next/server'
import { getPaystack } from '@/lib/billing'
import prisma from '@/lib/prisma'
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '@/lib/billing-constants'
import { activateSubscription } from '@/lib/subscription-manager'

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

      // Update subscription status if not already active and subscription exists
      if (payment.subscription && payment.subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
        const result = await activateSubscription({
          subscriptionId: payment.subscription.id,
          paymentData: {
            reference,
            paymentId: paystackData.id?.toString() || '',
            amount: paystackData.amount || 0,
            currency: paystackData.currency || payment.subscription.plan.currency,
            authorization: paystackData.authorization
          },
          source: 'verification'
        })

        if (result.result.success && result.result.subscription) {
          return NextResponse.json({
            success: true,
            message: 'Payment verified and subscription activated successfully',
            payment: {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: PAYMENT_STATUS.SUCCEEDED
            },
            subscription: {
              id: result.result.subscription.id,
              status: SUBSCRIPTION_STATUS.ACTIVE,
              plan: payment.subscription.plan
            }
          })
        } else {
          console.error('Failed to activate subscription during verification:', result.result.reason)
          return NextResponse.json({
            success: false,
            message: 'Payment verified but subscription activation failed',
            error: result.result.reason
          }, { status: 500 })
        }
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
          status: payment.subscription.status,
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