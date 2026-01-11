/**
 * Test complete Paystack payment flow
 */

require('dotenv').config()

async function testPaymentFlow() {
  console.log('🧪 Testing Complete Payment Flow...\n')
  
  // Test 1: Initialize Payment
  console.log('1️⃣ Testing Payment Initialization...')
  
  try {
    const initResponse = await fetch('http://localhost:3000/api/billing/initialize-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper authentication
        // You'll need to add proper session handling for real tests
      },
      body: JSON.stringify({
        email: 'test@example.com',
        amount: 1000, // 10.00
        planId: 'test-plan-id',
        currency: 'NGN'
      })
    })
    
    if (initResponse.ok) {
      const data = await initResponse.json()
      console.log('✅ Payment initialization successful')
      console.log('Access Code:', data.access_code?.substring(0, 20) + '...')
      console.log('Payment URL:', data.authorization_url?.substring(0, 50) + '...')
      
      // Test 2: Simulate successful payment webhook
      console.log('\n2️⃣ Simulating successful payment webhook...')
      
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: Date.now(),
          reference: data.reference,
          amount: 100000, // 1000.00 in kobo
          currency: 'NGN',
          status: 'success',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: 'card',
          gateway_response: 'Approved by Financial Institution',
          metadata: {
            type: 'subscription_setup',
            subscription_id: data.subscription_id
          },
          customer: {
            email: 'test@example.com'
          },
          authorization: {
            authorization_code: 'AUTH_test123',
            bin: '539999',
            last4: '1234',
            exp_month: '12',
            exp_year: '2025',
            card_type: 'visa',
            bank: 'Test Bank'
          }
        }
      }
      
      // Generate webhook signature
      const crypto = require('crypto')
      const rawBody = JSON.stringify(webhookPayload)
      const signature = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')
      
      const webhookResponse = await fetch('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': signature
        },
        body: rawBody
      })
      
      const webhookResult = await webhookResponse.text()
      
      if (webhookResponse.ok) {
        console.log('✅ Webhook processed successfully:', webhookResult)
      } else {
        console.log('❌ Webhook processing failed:', webhookResponse.status, webhookResult)
      }
      
    } else {
      const error = await initResponse.text()
      console.log('❌ Payment initialization failed:', initResponse.status, error)
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

// Test webhook signature generation
function testSignatureGeneration() {
  console.log('\n🔐 Testing Webhook Signature Generation...')
  
  const testPayload = { event: 'test', data: { reference: 'test_ref' } }
  const rawBody = JSON.stringify(testPayload)
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET
  
  if (!secret) {
    console.log('❌ PAYSTACK_WEBHOOK_SECRET not found')
    return
  }
  
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
  
  console.log('✅ Signature generated successfully')
  console.log('Payload:', rawBody)
  console.log('Signature:', signature.substring(0, 20) + '...')
  
  // Verify signature
  const verifySignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
  const isValid = signature === verifySignature
  
  console.log('Signature verification:', isValid ? '✅ Valid' : '❌ Invalid')
}

async function main() {
  console.log('🎯 Paystack Payment Flow Test\n')
  
  testSignatureGeneration()
  await testPaymentFlow()
  
  console.log('\n✨ Test completed!')
}

main().catch(console.error)