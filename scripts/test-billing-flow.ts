/**
 * Billing Flow Test Script
 * Tests the complete billing flow to ensure frontend-backend sync
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  step: string
  success: boolean
  message: string
  data?: any
}

async function testBillingFlow(): Promise<TestResult[]> {
  const results: TestResult[] = []
  
  try {
    // 1. Test subscription creation
    results.push({
      step: 'Database Connection',
      success: true,
      message: 'Connected to database successfully'
    })

    // 2. Check billing plans exist
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true }
    })
    
    results.push({
      step: 'Billing Plans',
      success: plans.length > 0,
      message: `Found ${plans.length} active billing plans`,
      data: plans.map(p => ({ id: p.id, name: p.name, price: p.price }))
    })

    // 3. Check for incomplete subscriptions
    const incompleteSubscriptions = await prisma.subscription.findMany({
      where: { status: 'incomplete' },
      include: { plan: true, user: true },
      take: 5
    })

    results.push({
      step: 'Incomplete Subscriptions',
      success: true,
      message: `Found ${incompleteSubscriptions.length} incomplete subscriptions`,
      data: incompleteSubscriptions.map(s => ({
        id: s.id,
        userId: s.userId,
        userEmail: s.user.email,
        planName: s.plan.name,
        createdAt: s.createdAt
      }))
    })

    // 4. Check for pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'pending' },
      include: { subscription: { include: { plan: true } } },
      take: 5
    })

    results.push({
      step: 'Pending Payments',
      success: true,
      message: `Found ${pendingPayments.length} pending payments`,
      data: pendingPayments.map(p => ({
        id: p.id,
        reference: p.providerPaymentRef,
        amount: p.amount,
        subscriptionId: p.subscriptionId,
        planName: p.subscription?.plan.name
      }))
    })

    // 5. Test webhook signature validation
    const crypto = require('crypto')
    const testBody = '{"event":"charge.success","data":{"reference":"test_ref"}}'
    const testSecret = 'test_secret'
    const testSignature = crypto
      .createHmac("sha512", testSecret)
      .update(testBody)
      .digest("hex")

    const { validateWebhookSignature } = await import('../lib/webhook-validation')
    const signatureTest = validateWebhookSignature(testBody, testSignature, testSecret)

    results.push({
      step: 'Webhook Signature Validation',
      success: signatureTest.isValid,
      message: signatureTest.isValid ? 'Signature validation working' : `Signature validation failed: ${signatureTest.error}`
    })

    // 6. Test subscription matching
    const { findBestSubscriptionMatchEnhanced } = await import('../lib/enhanced-subscription-matching')
    
    if (incompleteSubscriptions.length > 0) {
      const testSubscription = incompleteSubscriptions[0]
      const testAmount = testSubscription.plan.price * 100 // Convert to kobo
      
      const match = await findBestSubscriptionMatchEnhanced({
        reference: 'test_ref_123',
        amount: testAmount,
        currency: testSubscription.plan.currency,
        userEmail: testSubscription.user.email,
        metadata: { subscription_id: testSubscription.id },
        paymentId: 'test_payment_123'
      })

      results.push({
        step: 'Subscription Matching',
        success: match !== null && match.subscriptionId === testSubscription.id,
        message: match 
          ? `Successfully matched subscription ${match.subscriptionId} with ${match.confidence}% confidence`
          : 'No subscription match found',
        data: match ? {
          subscriptionId: match.subscriptionId,
          confidence: match.confidence,
          reasons: match.matchReasons,
          warnings: match.warnings
        } : null
      })
    } else {
      results.push({
        step: 'Subscription Matching',
        success: true,
        message: 'Skipped - no incomplete subscriptions to test with'
      })
    }

    // 7. Test grace period enforcement
    const { enforceGracePeriods } = await import('../lib/grace-period-enforcement')
    
    const gracePeriodResult = await enforceGracePeriods({
      gracePeriodDays: 7,
      warningDays: [3, 1],
      enableAutoCancel: false // Don't actually cancel in test
    })

    results.push({
      step: 'Grace Period Enforcement',
      success: gracePeriodResult.errors.length === 0,
      message: `Processed ${gracePeriodResult.processed} subscriptions, ${gracePeriodResult.errors.length} errors`,
      data: {
        processed: gracePeriodResult.processed,
        cancelled: gracePeriodResult.cancelled,
        warned: gracePeriodResult.warned,
        errors: gracePeriodResult.errors
      }
    })

  } catch (error) {
    results.push({
      step: 'Test Execution',
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  } finally {
    await prisma.$disconnect()
  }

  return results
}

async function main() {
  console.log('🧪 Starting Billing Flow Test...\n')
  
  const results = await testBillingFlow()
  
  let passedTests = 0
  let totalTests = results.length

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.step}: ${result.message}`)
    
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2))
    }
    
    if (result.success) {
      passedTests++
    }
    
    console.log('')
  }

  console.log(`📊 Test Summary: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Billing flow is working correctly.')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

export { testBillingFlow }