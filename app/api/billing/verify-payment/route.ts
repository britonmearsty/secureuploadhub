import { NextRequest, NextResponse } from 'next/server'
import { getPaystack } from '@/lib/billing'
import prisma from '@/lib/prisma'

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
      if (payment.status !== 'completed') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            providerResponse: JSON.stringify(paystackData)
          }
        })
      }

      // Update subscription status if not already active
      if (payment.subscription && payment.subscription.status !== 'active') {
        const now = new Date()
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: 'completed'
        },
        subscription: payment.subscription ? {
          id: payment.subscription.id,
          status: 'active',
          plan: payment.subscription.plan
        } : null
      })
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          providerResponse: JSON.stringify(paystackData)
        }
      })

      return NextResponse.json({
        success: false,
        message: 'Payment was not successful',
        payment: {
          id: payment.id,
          status: 'failed'
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