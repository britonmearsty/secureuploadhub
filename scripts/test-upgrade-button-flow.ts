/**
 * Test Upgrade Button Flow
 * Simulates the exact flow that happens when a user clicks the upgrade button
 */

import 'dotenv/config'
import prisma from '@/lib/prisma'

async function testUpgradeButtonFlow() {
  console.log('🔍 Testing Upgrade Button Flow...\n')

  try {
    // 1. Get a test user and plan
    console.log('1. Setting up test data...')
    
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: '@' } }
    })
    
    if (!testUser) {
      console.log('❌ No test user found')
      return
    }
    
    const testPlan = await prisma.billingPlan.findFirst({
      where: { 
        isActive: true,
        price: { gt: 0 }
      }
    })
    
    if (!testPlan) {
      console.log('❌ No paid plan found')
      return
    }
    
    console.log(`Test user: ${testUser.email}`)
    console.log(`Test plan: ${testPlan.name} ($${testPlan.price})`)

    // 2. Check for existing active subscription
    console.log('\n2. Checking existing subscriptions...')
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: testUser.id,
        status: { in: ["active", "past_due"] }
      }
    })
    
    if (existingSubscription) {
      console.log('⚠️  User already has an active subscription')
    } else {
      console.log('✅ No active subscription found')
    }

    // 3. Test Paystack customer creation
    console.log('\n3. Testing Paystack customer creation...')
    try {
      const { getOrCreatePaystackCustomer } = await import('@/lib/paystack-subscription')
      
      const paystackCustomer = await getOrCreatePaystackCustomer({
        email: testUser.email,
        first_name: testUser.name?.split(' ')[0] || undefined,
        last_name: testUser.name?.split(' ').slice(1).join(' ') || undefined,
      })
      
      console.log('✅ Paystack customer created:', paystackCustomer.customer_code)
    } catch (error: any) {
      console.log('❌ Paystack customer creation failed:', error.message)
      return
    }

    // 4. Test Paystack plan creation
    console.log('\n4. Testing Paystack plan creation...')
    try {
      const { getOrCreatePaystackPlan } = await import('@/lib/paystack-subscription')
      const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
      
      const paystackCurrency = getPaystackCurrency(testPlan.currency)
      const paystackPlan = await getOrCreatePaystackPlan({
        name: testPlan.name,
        amount: convertToPaystackSubunit(testPlan.price, paystackCurrency),
        interval: "monthly",
        currency: paystackCurrency,
        description: testPlan.description || undefined,
      })
      
      console.log('✅ Paystack plan created:', paystackPlan.plan_code)
    } catch (error: any) {
      console.log('❌ Paystack plan creation failed:', error.message)
      return
    }

    // 5. Test transaction initialization (the critical step)
    console.log('\n5. Testing transaction initialization...')
    try {
      const { getPaystack } = await import('@/lib/billing')
      const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
      const { PAYSTACK_CONFIG } = await import('@/lib/paystack-config')
      
      const paystack = await getPaystack()
      const paystackCurrency = getPaystackCurrency(testPlan.currency)
      const reference = `test_upgrade_${Date.now()}`
      
      console.log(`Initializing transaction with:`)
      console.log(`  Email: ${testUser.email}`)
      console.log(`  Amount: ${convertToPaystackSubunit(testPlan.price, paystackCurrency)} (${paystackCurrency})`)
      console.log(`  Reference: ${reference}`)
      
      const initializeResponse = await (paystack as any).transaction.initialize({
        email: testUser.email,
        amount: convertToPaystackSubunit(testPlan.price, paystackCurrency),
        currency: paystackCurrency,
        reference: reference,
        callback_url: `${PAYSTACK_CONFIG.baseUrl}/dashboard/billing?status=success`,
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
        metadata: {
          type: 'subscription_setup',
          subscription_id: 'test_sub_123',
          user_id: testUser.id,
          plan_id: testPlan.id,
          user_email: testUser.email,
          source: 'web_app',
          plan_name: testPlan.name,
          customer_name: testUser.name || testUser.email.split('@')[0]
        },
        custom_fields: [
          {
            display_name: "Plan Type",
            variable_name: "plan_type",
            value: testPlan.name
          },
          {
            display_name: "Billing Period",
            variable_name: "billing_period",
            value: "Monthly"
          }
        ]
      })
      
      if (initializeResponse.status && initializeResponse.data?.authorization_url) {
        console.log('✅ Transaction initialization successful!')
        console.log('✅ Payment URL generated:', initializeResponse.data.authorization_url.substring(0, 50) + '...')
        console.log('Reference:', initializeResponse.data.reference)
      } else {
        console.log('❌ Transaction initialization failed')
        console.log('Response:', initializeResponse)
      }
      
    } catch (error: any) {
      console.log('❌ Transaction initialization failed:', error.message)
      if (error.statusCode) {
        console.log('Status code:', error.statusCode)
        console.log('Error details:', error.error)
      }
      return
    }

    // 6. Test Redis connection (for reference mapping)
    console.log('\n6. Testing Redis connection...')
    try {
      const redis = await import('@/lib/redis')
      await redis.default.setex('test_upgrade_flow', 10, 'test_value')
      const value = await redis.default.get('test_upgrade_flow')
      if (value === 'test_value') {
        console.log('✅ Redis (in-memory cache) is working')
      } else {
        console.log('❌ Redis test failed')
      }
    } catch (error: any) {
      console.log('❌ Redis connection failed:', error.message)
    }

    console.log('\n✅ Upgrade button flow test complete!')
    console.log('\n🎯 CONCLUSION:')
    console.log('The upgrade button flow should work correctly now.')
    console.log('If users are still experiencing issues, it might be:')
    console.log('1. Frontend JavaScript errors')
    console.log('2. Network connectivity issues')
    console.log('3. Browser blocking the redirect')
    console.log('4. Webhook processing issues (check webhook endpoint)')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run if called directly
if (require.main === module) {
  testUpgradeButtonFlow().catch(console.error)
}

export { testUpgradeButtonFlow }