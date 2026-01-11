#!/usr/bin/env tsx

/**
 * Manually activate incomplete subscriptions
 * This bypasses the webhook issue and directly activates subscriptions
 */

import { config } from 'dotenv'
import prisma from '../lib/prisma'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../lib/billing-constants'

// Load environment variables
config()

async function manuallyActivateSubscriptions() {
  console.log('🔧 Manually Activating Incomplete Subscriptions...\n')

  try {
    // Find all incomplete subscriptions for the specific user
    const incompleteSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE,
        user: {
          email: "kiplaekc@gmail.com" // The user from your data
        }
      },
      include: {
        user: true,
        plan: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${incompleteSubscriptions.length} incomplete subscriptions for kiplaekc@gmail.com\n`)

    if (incompleteSubscriptions.length === 0) {
      console.log('✅ No incomplete subscriptions found!')
      return
    }

    // Take the most recent subscription (likely the one they want)
    const latestSubscription = incompleteSubscriptions[0]
    
    console.log(`📋 Latest Subscription Details:`)
    console.log(`   ID: ${latestSubscription.id}`)
    console.log(`   Plan: ${latestSubscription.plan.name} ($${latestSubscription.plan.price})`)
    console.log(`   Created: ${latestSubscription.createdAt.toISOString()}`)
    console.log(`   Status: ${latestSubscription.status}`)

    // Manually activate this subscription
    console.log('\n🔄 Manually activating subscription...')
    
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    await prisma.$transaction(async (tx) => {
      // Update subscription to active
      await tx.subscription.update({
        where: { id: latestSubscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          nextBillingDate: nextMonth,
          cancelAtPeriodEnd: false,
          retryCount: 0,
          gracePeriodEnd: null
        }
      })

      // Create a successful payment record
      await tx.payment.create({
        data: {
          subscriptionId: latestSubscription.id,
          userId: latestSubscription.userId,
          amount: latestSubscription.plan.price,
          currency: latestSubscription.plan.currency,
          status: PAYMENT_STATUS.SUCCEEDED,
          description: `Manual activation - ${latestSubscription.plan.name} plan`,
          providerPaymentRef: `manual_activation_${Date.now()}`,
          providerPaymentId: `manual_${latestSubscription.id}`
        }
      })

      // Create subscription history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: latestSubscription.id,
          action: 'activated',
          oldValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.INCOMPLETE }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
          reason: 'Manual activation due to webhook processing issues'
        }
      })
    })

    console.log('✅ Subscription activated successfully!')
    console.log(`   Status: ${SUBSCRIPTION_STATUS.INCOMPLETE} → ${SUBSCRIPTION_STATUS.ACTIVE}`)
    console.log(`   Period: ${now.toISOString()} → ${nextMonth.toISOString()}`)

    // Clean up other incomplete subscriptions for this user
    const otherIncomplete = incompleteSubscriptions.slice(1)
    if (otherIncomplete.length > 0) {
      console.log(`\n🧹 Cleaning up ${otherIncomplete.length} other incomplete subscriptions...`)
      
      for (const sub of otherIncomplete) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: true
          }
        })
        console.log(`   Canceled duplicate: ${sub.id}`)
      }
    }

    console.log('\n🎉 Manual activation complete!')
    console.log('The user should now have access to their subscription features.')

  } catch (error) {
    console.error('❌ Error during manual activation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the manual activation
manuallyActivateSubscriptions().catch(console.error)