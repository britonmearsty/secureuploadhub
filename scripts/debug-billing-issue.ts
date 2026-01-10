/**
 * Debug Billing Issue Script
 * Helps identify why the upgrade button processes forever
 */

import prisma from '@/lib/prisma'

async function debugBillingIssue() {
  console.log('🔍 Debugging billing issue...\n')

  try {
    // 1. Check environment variables
    console.log('1. Environment Variables:')
    const envVars = {
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? 'Set' : 'Missing',
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ? 'Set' : 'Missing',
      PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET ? 'Set' : 'Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'Set' : 'Missing',
      REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Missing'
    }
    console.table(envVars)

    // 2. Check billing plans
    console.log('\n2. Billing Plans:')
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true }
    })
    console.log(`Found ${plans.length} active plans:`)
    plans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price}/${plan.currency}`)
    })

    // 3. Check recent subscriptions
    console.log('\n3. Recent Subscriptions:')
    const recentSubs = await prisma.subscription.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { plan: true, user: true }
    })
    console.log(`Found ${recentSubs.length} recent subscriptions:`)
    recentSubs.forEach(sub => {
      console.log(`  - ${sub.user.email}: ${sub.plan.name} (${sub.status}) - ${sub.createdAt}`)
    })

    // 4. Check incomplete subscriptions
    console.log('\n4. Incomplete Subscriptions:')
    const incompleteSubs = await prisma.subscription.findMany({
      where: { status: 'incomplete' },
      include: { plan: true, user: true }
    })
    console.log(`Found ${incompleteSubs.length} incomplete subscriptions:`)
    incompleteSubs.forEach(sub => {
      console.log(`  - ${sub.user.email}: ${sub.plan.name} - ${sub.createdAt}`)
    })

    // 5. Check pending payments
    console.log('\n5. Pending Payments:')
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'pending' },
      include: { subscription: { include: { plan: true } } }
    })
    console.log(`Found ${pendingPayments.length} pending payments:`)
    pendingPayments.forEach(payment => {
      console.log(`  - ${payment.providerPaymentRef}: $${payment.amount} (${payment.subscription?.plan.name})`)
    })

    // 6. Test Paystack connection
    console.log('\n6. Testing Paystack Connection:')
    try {
      const { getPaystack } = await import('../lib/billing')
      const paystack = await getPaystack()
      console.log('✅ Paystack instance created successfully')
      
      // Try a simple API call
      try {
        await (paystack as any).transaction.verify('dummy_reference')
      } catch (error: any) {
        if (error.message?.includes('Transaction not found') || error.message?.includes('No transaction found')) {
          console.log('✅ Paystack API is responding (expected error for dummy reference)')
        } else {
          console.log('❌ Paystack API error:', error.message)
        }
      }
    } catch (error: any) {
      console.log('❌ Failed to create Paystack instance:', error.message)
    }

    // 7. Test Redis connection (now in-memory)
    console.log('\n7. Testing In-Memory Cache:')
    try {
      const redis = await import('../lib/redis')
      await redis.default.setex('test_key', 10, 'test_value')
      const value = await redis.default.get('test_key')
      if (value === 'test_value') {
        console.log('✅ In-memory cache is working')
      } else {
        console.log('❌ In-memory cache test failed')
      }
    } catch (error: any) {
      console.log('❌ In-memory cache failed:', error.message)
    }

    console.log('\n✅ Debug complete!')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run if called directly
if (require.main === module) {
  debugBillingIssue().catch(console.error)
}

export { debugBillingIssue }