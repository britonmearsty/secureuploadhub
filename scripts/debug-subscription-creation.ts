#!/usr/bin/env tsx

/**
 * Debug script to test subscription creation locally
 * This helps identify why subscription creation is failing with 500 errors
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function debugSubscriptionCreation() {
  console.log('🔍 Testing Subscription Creation API...\n')

  const baseUrl = process.env.NEXTAUTH_URL || 'https://secureuploadhub.vercel.app'
  const subscriptionUrl = `${baseUrl}/api/billing/subscription`
  
  console.log(`Testing URL: ${subscriptionUrl}`)

  // Test payload (similar to what frontend sends)
  const testPayload = {
    planId: "cmk48xnq7000004jsx038n6ey", // Using one of your plan IDs from the data
    billingCycle: "monthly"
  }

  console.log('Test payload:', JSON.stringify(testPayload, null, 2))

  try {
    console.log('\n1. Testing POST request to subscription endpoint...')
    
    const response = await fetch(subscriptionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would include authentication headers
      },
      body: JSON.stringify(testPayload)
    })

    console.log(`   - Status: ${response.status} ${response.statusText}`)
    console.log(`   - Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)

    if (response.ok) {
      const responseData = await response.json()
      console.log(`   - Response: ${JSON.stringify(responseData, null, 2)}`)
      console.log('\n✅ Subscription endpoint is working!')
    } else {
      const errorText = await response.text()
      console.log(`   - Error Response: ${errorText}`)
      
      if (response.status === 500) {
        console.log('\n❌ Internal Server Error (500)')
        console.log('This indicates a backend error in the subscription creation logic')
        console.log('Common causes:')
        console.log('- Database connection issues')
        console.log('- Missing environment variables')
        console.log('- Paystack API errors')
        console.log('- Authentication/session issues')
      } else if (response.status === 401) {
        console.log('\n⚠️ Unauthorized (401)')
        console.log('This is expected when testing without authentication')
      } else {
        console.log(`\n❌ Unexpected error: ${response.status}`)
      }
    }

  } catch (error) {
    console.error('\n❌ Failed to reach subscription endpoint:', error)
    console.log('\nPossible issues:')
    console.log('1. Network connectivity problems')
    console.log('2. Vercel deployment issues')
    console.log('3. API route not properly deployed')
  }

  // Test environment variables
  console.log('\n2. Checking environment variables...')
  const requiredEnvVars = [
    'DATABASE_URL',
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_WEBHOOK_SECRET',
    'NEXTAUTH_URL'
  ]

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    console.log(`   - ${envVar}: ${value ? '✅ Set' : '❌ Missing'}`)
    if (value && envVar.includes('SECRET')) {
      console.log(`     Value: ${value.substring(0, 10)}...`)
    }
  }
}

// Run the debug
debugSubscriptionCreation().catch(console.error)