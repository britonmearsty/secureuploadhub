/**
 * Subscription Email Utilities
 * Helper functions for sending subscription-related emails
 */

import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"
import { 
  sendSubscriptionExpiredSafe,
  sendPaymentFailedSafe 
} from "@/lib/email-templates"
import { FREE_PLAN } from "@/lib/billing"

/**
 * Send expiration emails for subscriptions that have expired
 */
export async function sendExpirationEmails() {
  const now = new Date()
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // Find subscriptions that expired in the last 24 hours and haven't been notified
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SUBSCRIPTION_STATUS.CANCELED,
      currentPeriodEnd: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
        lte: now
      },
      // Add a flag to track if expiration email was sent
      // For now, we'll check if there's no recent subscription history entry
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      },
      plan: true
    }
  })

  let emailsSent = 0
  let emailsFailed = 0

  for (const subscription of expiredSubscriptions) {
    if (!subscription.user.email) continue

    try {
      const success = await sendSubscriptionExpiredSafe(
        subscription.user.email,
        subscription.plan.name,
        subscription.currentPeriodEnd || new Date(),
        `${baseUrl}/dashboard/billing`,
        `${baseUrl}/dashboard/billing`,
        FREE_PLAN.features,
        subscription.user.name || undefined,
        subscription.gracePeriodEnd || undefined
      )

      if (success) {
        emailsSent++
        
        // Log that we sent the expiration email
        await prisma.subscriptionHistory.create({
          data: {
            subscriptionId: subscription.id,
            action: "expiration_email_sent",
            newValue: JSON.stringify({ emailSent: true }),
            reason: "Subscription expiration email sent to user",
          }
        })
      } else {
        emailsFailed++
      }
    } catch (error) {
      console.error(`Failed to send expiration email for subscription ${subscription.id}:`, error)
      emailsFailed++
    }
  }

  console.log(`Expiration emails: ${emailsSent} sent, ${emailsFailed} failed`)
  return { sent: emailsSent, failed: emailsFailed }
}

/**
 * Send reminder emails for subscriptions approaching expiration
 */
export async function sendExpirationReminders() {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // Find subscriptions that will expire in 3 days and are marked for cancellation
  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: {
        gte: now,
        lte: threeDaysFromNow
      }
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      },
      plan: true
    }
  })

  let emailsSent = 0
  let emailsFailed = 0

  for (const subscription of expiringSubscriptions) {
    if (!subscription.user.email) continue

    try {
      const success = await sendSubscriptionExpiredSafe(
        subscription.user.email,
        subscription.plan.name,
        subscription.currentPeriodEnd || new Date(),
        `${baseUrl}/dashboard/billing`,
        `${baseUrl}/dashboard/billing`,
        FREE_PLAN.features,
        subscription.user.name || undefined
      )

      if (success) {
        emailsSent++
      } else {
        emailsFailed++
      }
    } catch (error) {
      console.error(`Failed to send expiration reminder for subscription ${subscription.id}:`, error)
      emailsFailed++
    }
  }

  console.log(`Expiration reminders: ${emailsSent} sent, ${emailsFailed} failed`)
  return { sent: emailsSent, failed: emailsFailed }
}

/**
 * Send payment retry notifications for past due subscriptions
 */
export async function sendPaymentRetryNotifications() {
  const now = new Date()
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // Find subscriptions that are past due and within grace period
  const pastDueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      gracePeriodEnd: {
        gte: now // Still within grace period
      }
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      },
      plan: true
    }
  })

  let emailsSent = 0
  let emailsFailed = 0

  for (const subscription of pastDueSubscriptions) {
    if (!subscription.user.email) continue

    try {
      const success = await sendPaymentFailedSafe(
        subscription.user.email,
        subscription.plan.name,
        subscription.plan.price,
        subscription.plan.currency,
        subscription.lastPaymentAttempt || new Date(),
        `${baseUrl}/dashboard/billing`,
        `${baseUrl}/dashboard/billing`,
        subscription.user.name || undefined,
        undefined, // retryDate - could be calculated
        subscription.gracePeriodEnd || undefined,
        "Your subscription payment is past due"
      )

      if (success) {
        emailsSent++
      } else {
        emailsFailed++
      }
    } catch (error) {
      console.error(`Failed to send payment retry notification for subscription ${subscription.id}:`, error)
      emailsFailed++
    }
  }

  console.log(`Payment retry notifications: ${emailsSent} sent, ${emailsFailed} failed`)
  return { sent: emailsSent, failed: emailsFailed }
}

/**
 * Run all subscription email tasks
 */
export async function runSubscriptionEmailTasks() {
  console.log('Running subscription email tasks...')
  
  const results = await Promise.allSettled([
    sendExpirationEmails(),
    sendExpirationReminders(),
    sendPaymentRetryNotifications()
  ])

  const summary = {
    expirationEmails: results[0].status === 'fulfilled' ? results[0].value : { sent: 0, failed: 1 },
    expirationReminders: results[1].status === 'fulfilled' ? results[1].value : { sent: 0, failed: 1 },
    paymentRetryNotifications: results[2].status === 'fulfilled' ? results[2].value : { sent: 0, failed: 1 }
  }

  console.log('Subscription email tasks completed:', summary)
  return summary
}