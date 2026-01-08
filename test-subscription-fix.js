/**
 * Test script to verify subscription race condition fix
 * Run this to simulate concurrent subscription activation
 */

const { activateSubscription } = require('./lib/subscription-manager')

async function testConcurrentActivation() {
  console.log('Testing concurrent subscription activation...')
  
  const subscriptionId = 'test-subscription-id'
  const paymentData = {
    reference: 'test-ref-123',
    paymentId: 'test-payment-123',
    amount: 5000, // 50 NGN in kobo
    currency: 'NGN',
    authorization: {
      authorization_code: 'AUTH_test123'
    }
  }

  // Simulate 3 concurrent activation attempts (webhook, verification, manual)
  const promises = [
    activateSubscription({
      subscriptionId,
      paymentData,
      source: 'webhook'
    }),
    activateSubscription({
      subscriptionId,
      paymentData,
      source: 'verification'
    }),
    activateSubscription({
      subscriptionId,
      paymentData,
      source: 'manual'
    })
  ]

  try {
    const results = await Promise.all(promises)
    
    console.log('Results:')
    results.forEach((result, index) => {
      console.log(`  ${index + 1}:`, result.success ? 'SUCCESS' : 'FAILED', result.reason || '')
    })

    // Should have exactly one success and two "already_active" or "lock_timeout"
    const successCount = results.filter(r => r.success && r.reason !== 'already_active').length
    const alreadyActiveCount = results.filter(r => r.reason === 'already_active').length
    
    console.log(`\nSummary: ${successCount} activations, ${alreadyActiveCount} already active`)
    
    if (successCount === 1) {
      console.log('✅ Race condition protection working correctly!')
    } else {
      console.log('❌ Race condition detected - multiple activations succeeded')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testConcurrentActivation()
}

module.exports = { testConcurrentActivation }