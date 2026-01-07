#!/usr/bin/env tsx
/**
 * Subscription Health Monitor
 * 
 * This script monitors subscription health and automatically fixes common issues:
 * 1. Incomplete subscriptions with successful payments
 * 2. Subscriptions missing payment records
 * 3. Payment/subscription status mismatches
 * 
 * Usage:
 *   npx tsx scripts/monitor-subscription-health.ts [--fix] [--dry-run]
 */

import { config } from 'dotenv'
import prisma from '../lib/prisma'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../lib/billing-constants'
import { createAuditLog, AUDIT_ACTIONS } from '../lib/audit-log'
import { addMonths } from 'date-fns'

// Load environment variables
config()

interface HealthIssue {
  type: 'incomplete_with_payment' | 'missing_payment' | 'status_mismatch' | 'expired_incomplete'
  subscriptionId: string
  userId: string
  userEmail: string
  planName: string
  issue: string
  suggestedFix: string
  severity: 'high' | 'medium' | 'low'
}

interface HealthReport {
  timestamp: Date
  totalSubscriptions: number
  activeSubscriptions: number
  incompleteSubscriptions: number
  issues: HealthIssue[]
  fixesApplied: number
}

async function checkSubscriptionHealth(autoFix: boolean = false, dryRun: boolean = false): Promise<HealthReport> {
  console.log('🔍 Starting subscription health check...')
  
  const issues: HealthIssue[] = []
  let fixesApplied = 0

  // Get all subscriptions with related data
  const subscriptions = await prisma.subscription.findMany({
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
        orderBy: {
          createdAt: 'desc'
        },
        take: 5 // Get recent payments
      }
    }
  })

  console.log(`📊 Analyzing ${subscriptions.length} subscriptions...`)

  for (const subscription of subscriptions) {
    // Issue 1: Incomplete subscriptions with successful payments
    if (subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
      const successfulPayments = subscription.payments.filter(p => p.status === PAYMENT_STATUS.SUCCEEDED)
      
      if (successfulPayments.length > 0) {
        const latestPayment = successfulPayments[0]
        issues.push({
          type: 'incomplete_with_payment',
          subscriptionId: subscription.id,
          userId: subscription.userId,
          userEmail: subscription.user.email,
          planName: subscription.plan.name,
          issue: `Subscription is incomplete but has successful payment (${latestPayment.providerPaymentRef})`,
          suggestedFix: 'Activate subscription and update billing period',
          severity: 'high'
        })

        // Auto-fix if enabled
        if (autoFix && !dryRun) {
          try {
            await fixIncompleteSubscriptionWithPayment(subscription, latestPayment)
            fixesApplied++
            console.log(`✅ Fixed incomplete subscription: ${subscription.id}`)
          } catch (error) {
            console.error(`❌ Failed to fix subscription ${subscription.id}:`, error)
          }
        }
      } else {
        // Check if subscription is old (>24 hours) without payment
        const createdHoursAgo = (Date.now() - subscription.createdAt.getTime()) / (1000 * 60 * 60)
        if (createdHoursAgo > 24) {
          issues.push({
            type: 'expired_incomplete',
            subscriptionId: subscription.id,
            userId: subscription.userId,
            userEmail: subscription.user.email,
            planName: subscription.plan.name,
            issue: `Subscription incomplete for ${Math.round(createdHoursAgo)} hours without payment`,
            suggestedFix: 'Consider canceling or sending payment reminder',
            severity: 'medium'
          })
        }
      }
    }

    // Issue 2: Active subscriptions without successful payments
    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      const successfulPayments = subscription.payments.filter(p => p.status === PAYMENT_STATUS.SUCCEEDED)
      
      if (successfulPayments.length === 0) {
        issues.push({
          type: 'missing_payment',
          subscriptionId: subscription.id,
          userId: subscription.userId,
          userEmail: subscription.user.email,
          planName: subscription.plan.name,
          issue: 'Active subscription has no successful payments',
          suggestedFix: 'Verify payment status or deactivate subscription',
          severity: 'high'
        })
      }
    }

    // Issue 3: Payment/subscription status mismatches
    const recentSuccessfulPayment = subscription.payments.find(p => p.status === PAYMENT_STATUS.SUCCEEDED)
    if (recentSuccessfulPayment && subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      // Check if payment is recent (within last 7 days)
      const paymentAge = (Date.now() - recentSuccessfulPayment.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (paymentAge <= 7) {
        issues.push({
          type: 'status_mismatch',
          subscriptionId: subscription.id,
          userId: subscription.userId,
          userEmail: subscription.user.email,
          planName: subscription.plan.name,
          issue: `Recent successful payment but subscription status is ${subscription.status}`,
          suggestedFix: 'Update subscription status to active',
          severity: 'high'
        })
      }
    }
  }

  // Generate summary
  const totalSubscriptions = subscriptions.length
  const activeSubscriptions = subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.ACTIVE).length
  const incompleteSubscriptions = subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.INCOMPLETE).length

  const report: HealthReport = {
    timestamp: new Date(),
    totalSubscriptions,
    activeSubscriptions,
    incompleteSubscriptions,
    issues,
    fixesApplied
  }

  return report
}

async function fixIncompleteSubscriptionWithPayment(subscription: any, payment: any) {
  const now = new Date()
  const periodEnd = addMonths(now, 1)

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
        reason: "Auto-fixed: Found successful payment for incomplete subscription",
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
      action: "auto_fix_incomplete", 
      paymentRef: payment.providerPaymentRef,
      fixedBy: "health_monitor"
    }
  })
}

function printHealthReport(report: HealthReport, dryRun: boolean = false) {
  console.log('\n📋 SUBSCRIPTION HEALTH REPORT')
  console.log('=' .repeat(50))
  console.log(`Timestamp: ${report.timestamp.toISOString()}`)
  console.log(`Total Subscriptions: ${report.totalSubscriptions}`)
  console.log(`Active Subscriptions: ${report.activeSubscriptions}`)
  console.log(`Incomplete Subscriptions: ${report.incompleteSubscriptions}`)
  console.log(`Issues Found: ${report.issues.length}`)
  if (!dryRun) {
    console.log(`Fixes Applied: ${report.fixesApplied}`)
  }

  if (report.issues.length > 0) {
    console.log('\n🚨 ISSUES DETECTED:')
    console.log('-'.repeat(50))

    const highSeverity = report.issues.filter(i => i.severity === 'high')
    const mediumSeverity = report.issues.filter(i => i.severity === 'medium')
    const lowSeverity = report.issues.filter(i => i.severity === 'low')

    if (highSeverity.length > 0) {
      console.log(`\n🔴 HIGH SEVERITY (${highSeverity.length}):`)
      highSeverity.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.userEmail} - ${issue.planName}`)
        console.log(`   Issue: ${issue.issue}`)
        console.log(`   Fix: ${issue.suggestedFix}`)
        console.log(`   Subscription ID: ${issue.subscriptionId}`)
        console.log('')
      })
    }

    if (mediumSeverity.length > 0) {
      console.log(`\n🟡 MEDIUM SEVERITY (${mediumSeverity.length}):`)
      mediumSeverity.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.userEmail} - ${issue.planName}`)
        console.log(`   Issue: ${issue.issue}`)
        console.log('')
      })
    }

    if (lowSeverity.length > 0) {
      console.log(`\n🟢 LOW SEVERITY (${lowSeverity.length}):`)
      lowSeverity.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.userEmail} - ${issue.planName}`)
        console.log(`   Issue: ${issue.issue}`)
        console.log('')
      })
    }
  } else {
    console.log('\n✅ No issues detected! All subscriptions are healthy.')
  }

  console.log('\n' + '='.repeat(50))
}

async function main() {
  const args = process.argv.slice(2)
  const autoFix = args.includes('--fix')
  const dryRun = args.includes('--dry-run')

  if (dryRun && autoFix) {
    console.log('⚠️  Cannot use --fix and --dry-run together. Using --dry-run mode.')
  }

  try {
    const report = await checkSubscriptionHealth(autoFix && !dryRun, dryRun)
    printHealthReport(report, dryRun)

    if (dryRun) {
      console.log('\n💡 This was a dry run. Use --fix to apply fixes automatically.')
    } else if (autoFix) {
      console.log('\n🔧 Auto-fix mode was enabled. Issues were automatically resolved where possible.')
    } else {
      console.log('\n💡 Use --fix to automatically resolve issues, or --dry-run to preview fixes.')
    }

  } catch (error) {
    console.error('❌ Health check failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Export for use in API endpoints
export { checkSubscriptionHealth, fixIncompleteSubscriptionWithPayment }

// Run if called directly
if (require.main === module) {
  main()
}