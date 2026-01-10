/**
 * Test Subscription Creation Flow
 * Tests the actual subscription creation process that the upgrade button uses
 */

import 'dotenv/config'
import prisma from '@/lib/prisma'

async function testSubscriptionFlow() {
  console.log('🔍 Testing Subscription Creation Flow...\n')

  try {
    // 1. Check billing plans
    console.log('1. Checking Billing Plans:')
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true }
    })
    
    if (plans.length === 0) {
      console.log('❌ No active billing plans found!')
      console.log('Creating test plans...')
      
      // Create test plans with USD currency
      const testPlans = [
        {
          id: 'free',
          name: 'Free',
          description: 'Free tier with basic features',
          price: 0,
          currency: 'USD',
          features: ['1 Portal', '100MB Storage', '10 Uploads/month'],
          maxPortals: 1,
          maxStorageGB: 0.1,
          maxUploadsMonth: 10,
          isActive: true
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Professional tier with advanced features',
          price: 29,
          currency: 'USD',
          features: ['10 Portals', '10GB Storage', '1000 Uploads/month'],
          maxPortals: 10,
          maxStorageGB: 10,
          maxUploadsMonth: 1000,
          isActive: true
        }
      ]
      
      for (const plan of testPlans) {
        await prisma.billingPlan.upsert({
          where: { id: plan.id },
          update: plan,
          create: plan
        })
      }
      
      console.log('✅ Test plans created')
    } else {
      console.log(`Found ${plans.length} active plans:`)
      plans.forEach(plan => {
        console.log(`  - ${plan.name}: $${plan.price}/${plan.currency} (${plan.currency})`)
        if (plan.currency !== 'USD') {
          console.log(`    ⚠️  Plan uses ${plan.currency} but Paystack test account supports USD`)
        }
      })
    }

    // 2. Check for currency mismatches
    console.log('\n2. Checking Currency Configuration:')
    const nonUsdPlans = plans.filter(plan => plan.currency !== 'USD')
    if (nonUsdPlans.length > 0) {
      console.log('❌ Found plans with non-USD currency:')
      nonUsdPlans.forEach(plan => {
        console.log(`  - ${plan.name}: ${plan.currency}`)
      })
      console.log('\n🔧 Fixing currency mismatches...')
      
      for (const plan of nonUsdPlans) {
        await prisma.billingPlan.update({
          where: { id: plan.id },
          data: { currency: 'USD' }
        })
        console.log(`  ✅ Updated ${plan.name} to USD`)
      }
    } else {
      console.log('✅ All plans use USD currency')
    }

    // 3. Test subscription creation logic
    console.log('\n3. Testing Subscription Creation Logic:')
    const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
    
    const testPlan = plans.find(p => p.price > 0) || plans[0]
    const paystackCurrency = getPaystackCurrency(testPlan.currency)
    const paystackAmount = convertToPaystackSubunit(testPlan.price, paystackCurrency)
    
    console.log(`Test plan: ${testPlan.name}`)
    console.log(`Plan currency: ${testPlan.currency}`)
    console.log(`Paystack currency: ${paystackCurrency}`)
    console.log(`Plan amount: $${testPlan.price}`)
    console.log(`Paystack amount: ${paystackAmount} (subunits)`)
    
    if (testPlan.currency === paystackCurrency) {
      console.log('✅ Currency conversion working correctly')
    } else {
      console.log(`⚠️  Currency conversion: ${testPlan.currency} -> ${paystackCurrency}`)
    }

    // 4. Check for incomplete subscriptions
    console.log('\n4. Checking Incomplete Subscriptions:')
    const incompleteSubscriptions = await prisma.subscription.findMany({
      where: { status: 'incomplete' },
      include: { 
        plan: true, 
        user: { select: { email: true } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    })
    
    if (incompleteSubscriptions.length > 0) {
      console.log(`Found ${incompleteSubscriptions.length} incomplete subscriptions:`)
      incompleteSubscriptions.forEach(sub => {
        const latestPayment = sub.payments[0]
        console.log(`  - ${sub.user.email}: ${sub.plan.name} (${sub.plan.currency})`)
        console.log(`    Created: ${sub.createdAt}`)
        if (latestPayment) {
          console.log(`    Latest payment: ${latestPayment.status} (${latestPayment.providerPaymentRef})`)
        }
      })
    } else {
      console.log('✅ No incomplete subscriptions found')
    }

    console.log('\n✅ Subscription flow test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run if called directly
if (require.main === module) {
  testSubscriptionFlow().catch(console.error)
}

export { testSubscriptionFlow }