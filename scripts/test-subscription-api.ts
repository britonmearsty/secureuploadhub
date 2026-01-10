/**
 * Test Subscription API Endpoint
 * Tests the /api/billing/subscription endpoint directly
 */

import 'dotenv/config'

async function testSubscriptionAPI() {
  console.log('🔍 Testing Subscription API Endpoint...\n')

  try {
    // Test the API endpoint directly
    console.log('1. Testing subscription creation API...')
    
    const testPlanId = 'pro' // Use an existing plan ID
    
    console.log(`Making request to: http://localhost:3000/api/billing/subscription`)
    console.log(`Plan ID: ${testPlanId}`)
    
    const response = await fetch('http://localhost:3000/api/billing/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail due to authentication, but we can see the error
      },
      body: JSON.stringify({ planId: testPlanId })
    })
    
    console.log(`Response status: ${response.status}`)
    console.log(`Response status text: ${response.statusText}`)
    
    const responseData = await response.json()
    console.log('Response data:', JSON.stringify(responseData, null, 2))
    
    if (response.status === 401) {
      console.log('✅ API endpoint is responding (401 Unauthorized is expected without auth)')
    } else if (response.status === 200) {
      console.log('✅ API endpoint working correctly')
      if (responseData.paymentLink) {
        console.log('✅ Payment link generated successfully')
      }
    } else {
      console.log('❌ Unexpected response status')
    }

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server. Make sure the dev server is running on localhost:3000')
    } else {
      console.log('❌ Request failed:', error.message)
    }
  }

  console.log('\n✅ Subscription API test complete!')
}

// Run if called directly
if (require.main === module) {
  testSubscriptionAPI().catch(console.error)
}

export { testSubscriptionAPI }