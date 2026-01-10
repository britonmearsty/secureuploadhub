#!/usr/bin/env tsx

/**
 * Test script to verify webhook endpoint is accessible
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function testWebhookEndpoint() {
  console.log('🔍 Testing Webhook Endpoint Accessibility...\n')

  const webhookUrl = 'https://secureuploadhub.vercel.app/api/billing/webhook'
  
  console.log(`Testing URL: ${webhookUrl}`)

  try {
    // Test with a sample webhook payload
    const testPayload = {
      event: "charge.success",
      data: {
        id: 123456,
        reference: "test_ref_" + Date.now(),
        amount: 100000,
        currency: "USD",
        status: "success",
        customer: {
          email: "test@example.com"
        },
        metadata: {
          type: "subscription_setup",
          subscription_id: "test_sub_123"
        }
      }
    }

    console.log('\n1. Testing POST request to webhook endpoint...')
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'test_signature_for_endpoint_test'
      },
      body: JSON.stringify(testPayload)
    })

    console.log(`   - Status: ${response.status} ${response.statusText}`)
    console.log(`   - Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)

    if (response.ok) {
      const responseText = await response.text()
      console.log(`   - Response: ${responseText}`)
      console.log('\n✅ Webhook endpoint is accessible!')
    } else {
      const errorText = await response.text()
      console.log(`   - Error Response: ${errorText}`)
      
      if (response.status === 404) {
        console.log('\n❌ Webhook endpoint not found (404)')
        console.log('This means the URL is wrong or the API route doesn\'t exist')
      } else if (response.status === 400) {
        console.log('\n⚠️ Webhook endpoint exists but rejected the request (400)')
        console.log('This is expected if signature validation is enabled')
      } else {
        console.log(`\n❌ Unexpected error: ${response.status}`)
      }
    }

  } catch (error) {
    console.error('\n❌ Failed to reach webhook endpoint:', error)
    console.log('\nPossible issues:')
    console.log('1. Network connectivity problems')
    console.log('2. Vercel deployment issues')
    console.log('3. API route not properly deployed')
  }

  console.log('\n2. Testing if the route exists locally...')
  try {
    // Check if the route file exists
    const fs = require('fs')
    const routePath = 'app/api/billing/webhook/route.ts'
    
    if (fs.existsSync(routePath)) {
      console.log(`✅ Route file exists: ${routePath}`)
    } else {
      console.log(`❌ Route file missing: ${routePath}`)
    }
  } catch (error) {
    console.log(`⚠️ Could not check route file: ${error}`)
  }
}

// Run the test
testWebhookEndpoint().catch(console.error)