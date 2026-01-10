#!/usr/bin/env tsx

/**
 * Script to identify and fix incomplete subscriptions
 * This helps resolve the issue where payments are stuck in incomplete status
 */

import { config } from 'dotenv'
import prisma from '../lib/prisma'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../lib/billing-constants'
import { activateSubscription } from '../lib/subscription-manager'

// Load environment variables
config()

async function fixIncompleteSubscriptions() {
  console.log('🔍 Analyzing incomplete subscriptions...\n')

  try {
    // Find all incomplete subscriptions
    const incompleteSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE
      },
      include: {
        user: true,
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    console.log(`Found ${incompleteSubscriptions.length} incomplete subscriptions\n`)

    if (incompleteSubscriptions.length === 0) {
      console.log('✅ No incomplete subscriptions found!')
      return
    }

    // Analyze each subscription
    for (const subscription of incompleteSubscriptions) {
      console.log(`📋 Subscription: ${subscription.id}`)
      console.log(`   User: ${subscription.user.email}`)
      console.log(`   Plan: ${subscription.plan.name} ($${subscription.plan.price})`)
      console.log(`   Created: ${subscription.createdAt.toISOString()}`)
      console.log(`   Status: ${subscription.status}`)
      console.log(`   Provider ID: ${subscription.providerSubscriptionId || 'None'}`)
      
      // Check payments
      const payments = subscription.payments
      console.log(`   Payments: ${payments.length}`)
      
      if (payments.length > 0) {
        const latestPayment = payments[0]
        console.log(`   Latest payment: ${latestPayment.status} - $${latestPayment.amount} (${latestPayment.providerPaymentRef})`)
        
        // Check if we have a successful payment that could activate this subscription
        const successfulPayment = payments.find(p => p.status === PAYMENT_STATUS.SUCCEEDED)
        
        if (successfulPayment) {
          console.log(`   ✅ Found successful payment: ${successfulPayment.providerPaymentRef}`)
          console.log(`   🔄 Attempting to activate subscription...`)
          
          try {
            const result = await activateSubscription({
              subscriptionId: subscription.id,
              paymentData: {
                reference: successfulPayment.providerPaymentRef,
                paymentId: successfulPayment.providerPaymentId || 'unknown',
                amount: successfulPayment.amount * 100, // Convert to kobo
                currency: successfulPayment.currency,
                authorization: null
              },
              source: 'manual_fix'
            })
            
            if (result.result.success) {
              console.log(`   ✅ Subscription activated successfully!`)
            } else {
              console.log(`   ❌ Failed to activate: ${result.result.reason}`)
            }
          } catch (error) {
            console.log(`   ❌ Error activating subscription: ${error}`)
          }
        } else {
          console.log(`   ⚠️  No successful payments found`)
          
          // Check for pending payments that might need to be updated
          const pendingPayments = payments.filter(p => p.status === PAYMENT_STATUS.PENDING)
          if (pendingPayments.length > 0) {
            console.log(`   📝 Found ${pendingPayments.length} pending payments that might need webhook processing`)
          }
        }
      } else {
        console.log(`   ⚠️  No payments found for this subscription`)
      }
      
      console.log('') // Empty line for readability
    }

    // Summary
    console.log('\n📊 Summary:')
    const subscriptionsWithSuccessfulPayments = incompleteSubscriptions.filter(s => 
      s.payments.some(p => p.status === PAYMENT_STATUS.SUCCEEDED)
    )
    
    console.log(`   - Incomplete subscriptions: ${incompleteSubscriptions.length}`)
    console.log(`   - With successful payments: ${subscriptionsWithSuccessfulPayments.length}`)
    console.log(`   - Potentially fixable: ${subscriptionsWithSuccessfulPayments.length}`)

    if (subscriptionsWithSuccessfulPayments.length > 0) {
      console.log('\n💡 Recommendations:')
      console.log('1. Check webhook configuration - payments succeeded but subscriptions not activated')
      console.log('2. Verify PAYSTACK_WEBHOOK_SECRET is correct')
      console.log('3. Check webhook URL is properly configured in Paystack Dashboard')
      console.log('4. Review webhook logs for any errors')
    }

    // Check for duplicate subscriptions for the same user
    console.log('\n🔍 Checking for duplicate subscriptions...')
    const userSubscriptionCounts = await prisma.subscription.groupBy({
      by: ['userId'],
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE
      },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    })

    if (userSubscriptionCounts.length > 0) {
      console.log(`⚠️  Found ${userSubscriptionCounts.length} users with multiple incomplete subscriptions`)
      
      for (const userCount of userSubscriptionCounts) {
        const user = await prisma.user.findUnique({
          where: { id: userCount.userId }
        })
        console.log(`   - ${user?.email}: ${userCount._count.id} incomplete subscriptions`)
      }
      
      console.log('\n💡 This suggests users are retrying payments, creating multiple incomplete subscriptions')
      console.log('   Consider implementing duplicate prevention or cleanup logic')
    }

  } catch (error) {
    console.error('❌ Error analyzing subscriptions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
fixIncompleteSubscriptions().catch(console.error)