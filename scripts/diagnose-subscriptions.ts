#!/usr/bin/env tsx
/**
 * Diagnostic script to analyze subscription and payment status
 * 
 * This script provides insights into the current state of subscriptions
 * and helps identify issues with payment processing.
 * 
 * Usage:
 *   npx tsx scripts/diagnose-subscriptions.ts
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import prisma from '../lib/prisma'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../lib/billing-constants'

interface DiagnosticResult {
  subscriptionStats: {
    total: number
    byStatus: Record<string, number>
  }
  paymentStats: {
    total: number
    byStatus: Record<string, number>
  }
  incompleteAnalysis: {
    totalIncomplete: number
    withSuccessfulPayments: number
    withoutPayments: number
    recentIncomplete: number
  }
  recentActivity: {
    subscriptionsLast24h: number
    paymentsLast24h: number
    webhooksProcessed: number
  }
  problemCases: Array<{
    subscriptionId: string
    userId: string
    userEmail: string
    status: string
    planName: string
    createdAt: Date
    paymentCount: number
    successfulPayments: number
    lastPaymentStatus?: string
    lastPaymentDate?: Date
    issue: string
  }>
}

async function diagnoseSubscriptions(): Promise<DiagnosticResult> {
  console.log('🔍 Running subscription diagnostics...')

  // Get subscription stats
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { email: true } },
      plan: { select: { name: true } },
      payments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  const subscriptionStats = {
    total: subscriptions.length,
    byStatus: subscriptions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Get payment stats
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' }
  })

  const paymentStats = {
    total: payments.length,
    byStatus: payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Analyze incomplete subscriptions
  const incompleteSubscriptions = subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.INCOMPLETE)
  const incompleteWithPayments = incompleteSubscriptions.filter(s =>
    s.payments.some(p => p.status === PAYMENT_STATUS.SUCCEEDED)
  )

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentIncomplete = incompleteSubscriptions.filter(s => s.createdAt > last24h)

  const incompleteAnalysis = {
    totalIncomplete: incompleteSubscriptions.length,
    withSuccessfulPayments: incompleteWithPayments.length,
    withoutPayments: incompleteSubscriptions.length - incompleteWithPayments.length,
    recentIncomplete: recentIncomplete.length
  }

  // Recent activity
  const recentSubscriptions = subscriptions.filter(s => s.createdAt > last24h)
  const recentPayments = payments.filter(p => p.createdAt > last24h)

  const recentActivity = {
    subscriptionsLast24h: recentSubscriptions.length,
    paymentsLast24h: recentPayments.length,
    webhooksProcessed: recentPayments.filter(p => p.providerPaymentId).length
  }

  // Identify problem cases
  const problemCases = []

  for (const subscription of subscriptions) {
    const successfulPayments = subscription.payments.filter(p => p.status === PAYMENT_STATUS.SUCCEEDED)
    const lastPayment = subscription.payments[0]

    let issue = ''

    // Case 1: Incomplete with successful payment
    if (subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE && successfulPayments.length > 0) {
      issue = 'Incomplete subscription with successful payment - needs activation'
    }

    // Case 2: Active subscription with no payments
    else if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE && successfulPayments.length === 0) {
      issue = 'Active subscription with no successful payments - potential data issue'
    }

    // Case 3: Old incomplete subscription (>7 days)
    else if (subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE &&
      subscription.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      issue = 'Old incomplete subscription - may need cleanup'
    }

    // Case 4: Multiple failed payments
    else if (subscription.payments.filter(p => p.status === PAYMENT_STATUS.FAILED).length > 2) {
      issue = 'Multiple failed payments - user may need assistance'
    }

    if (issue) {
      problemCases.push({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        userEmail: subscription.user.email,
        status: subscription.status,
        planName: subscription.plan.name,
        createdAt: subscription.createdAt,
        paymentCount: subscription.payments.length,
        successfulPayments: successfulPayments.length,
        lastPaymentStatus: lastPayment?.status,
        lastPaymentDate: lastPayment?.createdAt,
        issue
      })
    }
  }

  return {
    subscriptionStats,
    paymentStats,
    incompleteAnalysis,
    recentActivity,
    problemCases
  }
}

async function main() {
  try {
    const results = await diagnoseSubscriptions()

    console.log('\n📊 SUBSCRIPTION DIAGNOSTICS REPORT')
    console.log('=====================================')

    // Subscription Stats
    console.log('\n📈 Subscription Statistics:')
    console.log(`Total Subscriptions: ${results.subscriptionStats.total}`)
    Object.entries(results.subscriptionStats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // Payment Stats
    console.log('\n💳 Payment Statistics:')
    console.log(`Total Payments: ${results.paymentStats.total}`)
    Object.entries(results.paymentStats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // Incomplete Analysis
    console.log('\n⚠️  Incomplete Subscription Analysis:')
    console.log(`Total Incomplete: ${results.incompleteAnalysis.totalIncomplete}`)
    console.log(`With Successful Payments: ${results.incompleteAnalysis.withSuccessfulPayments} ⚠️`)
    console.log(`Without Payments: ${results.incompleteAnalysis.withoutPayments}`)
    console.log(`Recent (24h): ${results.incompleteAnalysis.recentIncomplete}`)

    // Recent Activity
    console.log('\n🕐 Recent Activity (Last 24h):')
    console.log(`New Subscriptions: ${results.recentActivity.subscriptionsLast24h}`)
    console.log(`New Payments: ${results.recentActivity.paymentsLast24h}`)
    console.log(`Webhook Payments: ${results.recentActivity.webhooksProcessed}`)

    // Problem Cases
    if (results.problemCases.length > 0) {
      console.log('\n🚨 PROBLEM CASES FOUND:')
      console.log('========================')

      results.problemCases.forEach((problem, index) => {
        console.log(`\n${index + 1}. ${problem.userEmail}`)
        console.log(`   Subscription: ${problem.subscriptionId}`)
        console.log(`   Status: ${problem.status}`)
        console.log(`   Plan: ${problem.planName}`)
        console.log(`   Created: ${problem.createdAt.toISOString()}`)
        console.log(`   Payments: ${problem.successfulPayments}/${problem.paymentCount} successful`)
        if (problem.lastPaymentDate) {
          console.log(`   Last Payment: ${problem.lastPaymentStatus} on ${problem.lastPaymentDate.toISOString()}`)
        }
        console.log(`   Issue: ${problem.issue}`)
      })

      console.log(`\n🔧 RECOMMENDED ACTIONS:`)
      const fixableCount = results.problemCases.filter(p =>
        p.issue.includes('Incomplete subscription with successful payment')
      ).length

      if (fixableCount > 0) {
        console.log(`1. Run fix script to activate ${fixableCount} incomplete subscriptions with payments:`)
        console.log(`   npx tsx scripts/fix-incomplete-subscriptions.ts`)
        console.log(`   OR call admin API: POST /api/admin/fix-subscriptions`)
      }

      const oldIncomplete = results.problemCases.filter(p =>
        p.issue.includes('Old incomplete subscription')
      ).length

      if (oldIncomplete > 0) {
        console.log(`2. Review ${oldIncomplete} old incomplete subscriptions for cleanup`)
      }

    } else {
      console.log('\n✅ No problem cases found!')
    }

    console.log('\n🎉 Diagnostics completed!')

  } catch (error) {
    console.error('💥 Diagnostics failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { diagnoseSubscriptions }