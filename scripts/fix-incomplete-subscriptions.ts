#!/usr/bin/env tsx
/**
 * Script to fix incomplete subscriptions that have successful payments
 * 
 * This script finds all incomplete subscriptions with successful payments
 * and activates them manually.
 * 
 * Usage:
 *   npx tsx scripts/fix-incomplete-subscriptions.ts
 *   
 * Or via API call:
 *   curl -X POST https://your-domain.com/api/admin/fix-subscriptions \
 *     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
 */

import { config } from 'dotenv'
import prisma from '../lib/prisma'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../lib/billing-constants'
import { createAuditLog, AUDIT_ACTIONS } from '../lib/audit-log'
import { addMonths } from 'date-fns'

// Load environment variables
config()

interface FixResult {
  subscriptionId: string
  userId: string
  userEmail: string
  planName: string
  paymentId: string
  paymentAmount: number
  success: boolean
  error?: string
}

async function fixIncompleteSubscriptions(): Promise<FixResult[]> {
  console.log('🔍 Finding incomplete subscriptions with successful payments...')
  
  // Find all incomplete subscriptions
  const incompleteSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SUBSCRIPTION_STATUS.INCOMPLETE
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      plan: {
        select: {
          id: true,
          name: true,
          price: true
        }
      },
      payments: {
        where: {
          status: PAYMENT_STATUS.SUCCEEDED
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  })

  console.log(`📊 Found ${incompleteSubscriptions.length} incomplete subscriptions`)

  const results: FixResult[] = []

  for (const subscription of incompleteSubscriptions) {
    const result: FixResult = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      userEmail: subscription.user.email,
      planName: subscription.plan.name,
      paymentId: '',
      paymentAmount: 0,
      success: false
    }

    try {
      // Check if there's a successful payment
      if (subscription.payments.length === 0) {
        result.error = 'No successful payments found'
        results.push(result)
        continue
      }

      const successfulPayment = subscription.payments[0]
      result.paymentId = successfulPayment.id
      result.paymentAmount = successfulPayment.amount

      console.log(`🔧 Fixing subscription ${subscription.id} for ${subscription.user.email}`)

      // Activate the subscription
      const now = new Date()
      const periodEnd = addMonths(now, 1) // Use proper date calculation

      await prisma.$transaction(async (tx) => {
        // Update subscription to active
        await tx.subscription.update({
          where: { id: subscription.id },
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
        await tx.subscriptionHistory.create({
          data: {
            subscriptionId: subscription.id,
            action: "activated",
            oldValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.INCOMPLETE }),
            newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
            reason: "Activated by fix script - successful payment found",
          }
        })
      })

      // Create audit log
      await createAuditLog({
        userId: subscription.userId,
        action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
        resource: "subscription",
        resourceId: subscription.id,
        details: { 
          action: "script_activation", 
          paymentId: successfulPayment.id,
          paymentAmount: successfulPayment.amount,
          previousStatus: SUBSCRIPTION_STATUS.INCOMPLETE,
          script: "fix-incomplete-subscriptions"
        }
      })

      result.success = true
      console.log(`✅ Successfully activated subscription ${subscription.id}`)

    } catch (error: any) {
      result.error = error.message
      console.error(`❌ Failed to fix subscription ${subscription.id}:`, error.message)
    }

    results.push(result)
  }

  return results
}

async function main() {
  try {
    console.log('🚀 Starting incomplete subscription fix...')
    
    const results = await fixIncompleteSubscriptions()
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log('\n📈 Summary:')
    console.log(`✅ Successfully fixed: ${successful.length}`)
    console.log(`❌ Failed to fix: ${failed.length}`)
    
    if (successful.length > 0) {
      console.log('\n✅ Successfully Fixed:')
      successful.forEach(result => {
        console.log(`  - ${result.userEmail} (${result.planName}) - $${result.paymentAmount}`)
      })
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed to Fix:')
      failed.forEach(result => {
        console.log(`  - ${result.userEmail} (${result.planName}) - ${result.error}`)
      })
    }
    
    console.log('\n🎉 Fix script completed!')
    
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { fixIncompleteSubscriptions }