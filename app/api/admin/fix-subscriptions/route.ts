import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { fixIncompleteSubscriptions } from '@/scripts/fix-incomplete-subscriptions'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to fix incomplete subscriptions
 * Finds incomplete subscriptions with successful payments and activates them
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Admin ${session.user.email} triggered subscription fix`)

    const results = await fixIncompleteSubscriptions()
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      },
      results: {
        successful: successful.map(r => ({
          subscriptionId: r.subscriptionId,
          userEmail: r.userEmail,
          planName: r.planName,
          paymentAmount: r.paymentAmount
        })),
        failed: failed.map(r => ({
          subscriptionId: r.subscriptionId,
          userEmail: r.userEmail,
          planName: r.planName,
          error: r.error
        }))
      }
    })

  } catch (error: any) {
    console.error('Error fixing subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fix subscriptions', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get count of incomplete subscriptions that can be fixed
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { default: prisma } = await import('@/lib/prisma')
    const { SUBSCRIPTION_STATUS, PAYMENT_STATUS } = await import('@/lib/billing-constants')

    // Count incomplete subscriptions with successful payments
    const incompleteWithPayments = await prisma.subscription.count({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE,
        payments: {
          some: {
            status: PAYMENT_STATUS.SUCCEEDED
          }
        }
      }
    })

    // Count total incomplete subscriptions
    const totalIncomplete = await prisma.subscription.count({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE
      }
    })

    return NextResponse.json({
      totalIncomplete,
      incompleteWithPayments,
      canFix: incompleteWithPayments
    })

  } catch (error: any) {
    console.error('Error checking subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription status', details: error.message },
      { status: 500 }
    )
  }
}