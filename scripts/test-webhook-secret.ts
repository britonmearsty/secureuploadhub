#!/usr/bin/env tsx

/**
 * Test script to verify webhook secret configuration
 * This helps ensure the webhook secret is properly set and can validate signatures
 */

import { config } from 'dotenv'
import { validateWebhookSignature } from '../lib/webhook-validation'
import crypto from 'crypto'

// Load environment variables
config()

async function testWebhookSecret() {
  console.log('🔍 Testing Webhook Secret Configuration...\n')

  // Get webhook secret directly from env
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET

  // Check if webhook secret is configured
  console.log('1. Checking webhook secret configuration:')
  console.log(`   - Webhook secret set: ${webhookSecret ? 'Yes' : 'No'}`)
  console.log(`   - Secret length: ${webhookSecret?.length || 0} characters`)
  console.log(`   - Secret format: ${webhookSecret?.substring(0, 20)}...`)
  
  if (!webhookSecret || webhookSecret.startsWith('dummy_') || webhookSecret.startsWith('wh_test_your_actual')) {
    console.log('❌ Webhook secret is not properly configured!')
    console.log('\nCurrent value:', webhookSecret)
    console.log('\nTo fix this:')
    console.log('1. Go to your Paystack Dashboard → Settings → Webhooks')
    console.log('2. Find your webhook endpoint or create one')
    console.log('3. Copy the webhook secret (starts with wh_test_ for test mode)')
    console.log('4. Update your .env file: PAYSTACK_WEBHOOK_SECRET="your_actual_secret"')
    return
  }

  // Test signature validation with sample data
  console.log('\n2. Testing signature validation:')
  
  const testPayload = JSON.stringify({
    event: "charge.success",
    data: {
      id: 123456,
      reference: "test_ref_123",
      amount: 100000,
      currency: "USD",
      status: "success",
      customer: {
        email: "test@example.com"
      }
    }
  })

  // Generate a test signature using the configured secret
  const testSignature = crypto
    .createHmac("sha512", webhookSecret)
    .update(testPayload)
    .digest("hex")

  console.log(`   - Test payload: ${testPayload.substring(0, 50)}...`)
  console.log(`   - Generated signature: ${testSignature.substring(0, 20)}...`)

  // Validate the signature
  const validation = validateWebhookSignature(testPayload, testSignature, webhookSecret)
  
  if (validation.isValid) {
    console.log('✅ Signature validation works correctly!')
  } else {
    console.log(`❌ Signature validation failed: ${validation.error}`)
  }

  // Test with invalid signature
  console.log('\n3. Testing invalid signature detection:')
  const invalidValidation = validateWebhookSignature(testPayload, 'invalid_signature', webhookSecret)
  
  if (!invalidValidation.isValid) {
    console.log('✅ Invalid signatures are correctly rejected')
  } else {
    console.log('❌ Invalid signatures are incorrectly accepted!')
  }

  console.log('\n4. Configuration summary:')
  console.log(`   - Webhook secret configured: ${validation.isValid ? '✅' : '❌'}`)
  console.log(`   - Signature validation working: ${validation.isValid ? '✅' : '❌'}`)
  console.log(`   - Invalid signature detection: ${!invalidValidation.isValid ? '✅' : '❌'}`)

  if (validation.isValid) {
    console.log('\n🎉 Webhook secret is properly configured and working!')
    console.log('\nNext steps:')
    console.log('1. Make sure this webhook secret matches what you have in Paystack Dashboard')
    console.log('2. Ensure your webhook URL is set to: https://secureuploadhub.vercel.app/api/billing/webhook')
    console.log('3. Test with a real payment to verify webhooks are received')
  } else {
    console.log('\n❌ Webhook secret needs to be fixed before payments will work properly')
  }
}

// Run the test
testWebhookSecret().catch(console.error)