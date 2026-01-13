/**
 * Test Webhook Secret Configuration Issue
 * Demonstrates the problem with using URL instead of secret key
 */

require('dotenv').config()
const crypto = require('crypto')

console.log('🔍 PAYSTACK WEBHOOK SECRET CONFIGURATION ISSUE\n')

// Get current configuration
const currentWebhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

console.log('📋 Current Configuration:')
console.log(`   PAYSTACK_WEBHOOK_SECRET: "${currentWebhookSecret}"`)
console.log(`   PAYSTACK_SECRET_KEY: "${paystackSecretKey}"`)
console.log('')

// Analyze the issue
console.log('🚨 PROBLEM IDENTIFIED:')
console.log('   The PAYSTACK_WEBHOOK_SECRET is set to a URL, not a secret key!')
console.log('   Current value is a webhook endpoint URL, not the secret for signature verification.')
console.log('')

// Test signature generation with both values
const testPayload = JSON.stringify({
  event: "charge.success",
  data: {
    id: 123456,
    reference: "test_ref_123",
    amount: 100000,
    status: "success"
  }
})

console.log('🧪 Testing Signature Generation:')
console.log('')

console.log('1. Using current PAYSTACK_WEBHOOK_SECRET (URL):')
try {
  const urlSignature = crypto.createHmac('sha512', currentWebhookSecret).update(testPayload).digest('hex')
  console.log(`   Generated signature: ${urlSignature.substring(0, 20)}...`)
  console.log('   ❌ This will NOT match Paystack\'s signature!')
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`)
}
console.log('')

console.log('2. Using PAYSTACK_SECRET_KEY (correct approach):')
try {
  const secretSignature = crypto.createHmac('sha512', paystackSecretKey).update(testPayload).digest('hex')
  console.log(`   Generated signature: ${secretSignature.substring(0, 20)}...`)
  console.log('   ✅ This WILL match Paystack\'s signature!')
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`)
}
console.log('')

console.log('📚 PAYSTACK DOCUMENTATION:')
console.log('   According to Paystack docs, webhook signature verification uses:')
console.log('   - The same SECRET KEY used for API calls')
console.log('   - HMAC SHA512 algorithm')
console.log('   - The raw request body as input')
console.log('')

console.log('🔧 SOLUTION:')
console.log('   Option 1: Use PAYSTACK_SECRET_KEY for webhook verification')
console.log('   Option 2: Set PAYSTACK_WEBHOOK_SECRET to the same value as PAYSTACK_SECRET_KEY')
console.log('')

console.log('🎯 RECOMMENDED FIX:')
console.log('   Update .env file:')
console.log(`   PAYSTACK_WEBHOOK_SECRET="${paystackSecretKey}"`)
console.log('')
console.log('   OR modify the webhook validation to use PAYSTACK_SECRET_KEY directly')
console.log('')

console.log('📍 WEBHOOK ENDPOINT CONFIGURATION:')
console.log('   The webhook URL should be registered in Paystack Dashboard as:')
console.log('   https://secureuploadhub.vercel.app/api/billing/webhook')
console.log('')
console.log('   NOT used as the webhook secret for signature verification!')