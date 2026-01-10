#!/usr/bin/env tsx

/**
 * Simple webhook test to isolate the issue
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function testSimpleWebhook() {
  console.log('🔍 Testing Simple Webhook...\n')

  const webhookUrl = 'https://secureuploadhub.vercel.app/api/billing/webhook'
  
  // Very simple test payload
  const simplePayload = {
    event: "charge.success",
    data: {
      id: 123,
      reference: "test_123",
      amount: 100,
      currency: "USD",
      status: "success"
    }
  }

  console.log('Testing with minimal payload:', JSON.stringify(simplePayload, null, 2))

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'test_signature'
      },
      body: JSON.stringify(simplePayload)
    })

    console.log(`Status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Success:', result)
    } else {
      const error = await response.text()
      console.log('❌ Error:', error)
      
      // Check if it's a deployment issue
      if (response.status === 500) {
        console.log('\n🔍 Possible causes of 500 error:')
        console.log('1. Code deployment not complete')
        console.log('2. Database connection issues')
        console.log('3. Missing environment variables on Vercel')
        console.log('4. Runtime errors in webhook processing')
        
        console.log('\n💡 Try waiting 2-3 minutes for deployment to complete')
      }
    }

  } catch (error) {
    console.error('Network error:', error)
  }

  // Also test if the deployment is complete by checking a simple endpoint
  console.log('\n🔍 Testing if deployment is complete...')
  try {
    const healthResponse = await fetch('https://secureuploadhub.vercel.app/api/billing/test-paystack')
    console.log(`Health check status: ${healthResponse.status}`)
    
    if (healthResponse.ok) {
      console.log('✅ Deployment appears to be complete')
    } else {
      console.log('⚠️ Deployment might still be in progress')
    }
  } catch (error) {
    console.log('❌ Could not reach health check endpoint')
  }
}

testSimpleWebhook().catch(console.error)