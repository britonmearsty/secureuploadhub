import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/api-auth"
import { runSubscriptionEmailTasks } from "@/lib/subscription-emails"

// POST /api/admin/subscription-emails - Manually trigger subscription email tasks
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await getAuthenticatedUser('admin')

    console.log(`Admin ${user.email} triggered subscription email tasks`)

    const results = await runSubscriptionEmailTasks()
    
    const totalSent = results.expirationEmails.sent + 
                     results.expirationReminders.sent + 
                     results.paymentRetryNotifications.sent
    
    const totalFailed = results.expirationEmails.failed + 
                       results.expirationReminders.failed + 
                       results.paymentRetryNotifications.failed

    return NextResponse.json({
      success: true,
      summary: {
        totalSent,
        totalFailed,
        details: results
      },
      message: `Subscription email tasks completed. ${totalSent} emails sent, ${totalFailed} failed.`
    })

  } catch (error) {
    // If error is already a NextResponse (from authentication), return it
    if (error instanceof NextResponse) {
      return error
    }
    
    console.error("Error running subscription email tasks:", error)
    return NextResponse.json({
      error: "Failed to run subscription email tasks",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET /api/admin/subscription-emails - Get subscription email statistics
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await getAuthenticatedUser('admin')

    const prisma = (await import("@/lib/prisma")).default
    const { SUBSCRIPTION_STATUS } = await import("@/lib/billing-constants")

    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Get statistics about subscriptions that need email notifications
    const [
      expiredSubscriptions,
      expiringSubscriptions,
      pastDueSubscriptions
    ] = await Promise.all([
      // Expired in last 24 hours
      prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.CANCELED,
          currentPeriodEnd: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            lte: now
          }
        }
      }),
      
      // Expiring in next 3 days
      prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: {
            gte: now,
            lte: threeDaysFromNow
          }
        }
      }),
      
      // Past due within grace period
      prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          gracePeriodEnd: {
            gte: now
          }
        }
      })
    ])

    return NextResponse.json({
      statistics: {
        expiredSubscriptions,
        expiringSubscriptions,
        pastDueSubscriptions,
        totalPendingEmails: expiredSubscriptions + expiringSubscriptions + pastDueSubscriptions
      },
      lastRun: "Manual trigger available",
      nextScheduledRun: "Configure via cron job"
    })

  } catch (error) {
    // If error is already a NextResponse (from authentication), return it
    if (error instanceof NextResponse) {
      return error
    }
    
    console.error("Error getting subscription email statistics:", error)
    return NextResponse.json({
      error: "Failed to get subscription email statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}