#!/usr/bin/env tsx

/**
 * Comprehensive billing system test
 * Tests all billing functionality end-to-end
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function testCompleteBillingFlow() {
  console.log('🧪 Testing Complete Billing Flow...\n')

  const baseUrl = process.env.NEXTAUTH_URL || 'https://secureuploadhub.vercel.app'
  
  const tests = [
    {
      name: 'Billing Plans API',
      url: `${baseUrl}/api/billing/plans`,
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Paystack Configuration',
      url: `${baseUrl}/api/billing/test-paystack`,
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Webhook Endpoint',
      url: `${baseUrl}/api/billing/webhook`,
      method: 'POST',
      body: {
        event: "charge.success",
        data: {
          id: 123,
          reference: "test_ref",
          amount: 100,
          currency: "USD",
          status: "success"
        }
      },
      expectedStatus: [400, 401], // 400 for invalid signature, 401 for auth
      headers: { 'x-paystack-signature': 'test' }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`🔍 Testing: ${test.name}`)
    
    try {
      const options: RequestInit = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers
        }
      }

      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(test.url, options)
      
      const isExpectedStatus = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus.includes(response.status)
        : response.status === test.expectedStatus

      if (isExpectedStatus) {
        console.log(`   ✅ PASS - Status: ${response.status}`)
        passed++
      } else {
        console.log(`   ❌ FAIL - Expected: ${test.expectedStatus}, Got: ${response.status}`)
        failed++
      }

    } catch (error) {
      console.log(`   ❌ FAIL - Network error: ${error}`)
      failed++
    }
  }

  // Environment variables check
  console.log('\n🔍 Environment Variables Check:')
  const requiredEnvVars = [
    'PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_SECRET_KEY', 
    'PAYSTACK_WEBHOOK_SECRET',
    'DATABASE_URL',
    'NEXTAUTH_URL'
  ]

  let envPassed = 0
  let envFailed = 0

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (value && !value.includes('your_actual') && !value.includes('dummy')) {
      console.log(`   ✅ ${envVar}: Configured`)
      envPassed++
    } else {
      console.log(`   ❌ ${envVar}: Missing or placeholder`)
      envFailed++
    }
  }

  // Summary
  console.log('\n📊 Test Results:')
  console.log(`   API Tests: ${passed} passed, ${failed} failed`)
  console.log(`   Environment: ${envPassed} configured, ${envFailed} missing`)
  
  const allPassed = failed === 0 && envFailed === 0
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'READY' : 'NEEDS CONFIGURATION'}`)

  if (!allPassed) {
    console.log('\n💡 Next Steps:')
    if (envFailed > 0) {
      console.log('1. Configure missing environment variables')
      console.log('2. Update Vercel environment variables to match')
    }
    if (failed > 0) {
      console.log('3. Check API endpoint functionality')
      console.log('4. Verify deployment status')
    }
  }
}

testCompleteBillingFlow().catch(console.error)