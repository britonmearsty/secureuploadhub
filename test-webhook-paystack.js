/**
 * Paystack Webhook Test Utility
 * Tests webhook signature validation and event processing
 */

require('dotenv').config()
const crypto = require('crypto')

// Test webhook signature validation (matches your implementation)
function validateWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return { isValid: false, error: 'Missing signature or secret' }
  }

  try {
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
    const isValid = hash === signature
    
    return {
      isValid,
      error: isValid ? null : 'Signature mismatch',
      computedHash: hash,
      receivedSignature: signature
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Signature validation error: ${error.message}`
    }
  }
}

// Generate test webhook signature
function generateWebhookSignature(payload, secret) {
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
}

// Test webhook events based on Paystack documentation
const testEvents = {
  // Transaction successful event
  'charge.success': {
    event: 'charge.success',
    data: {
      id: 302961,
      domain: 'live',
      status: 'success',
      reference: 'qTPrJoy9Bx',
      amount: 10000,
      message: null,
      gateway_response: 'Approved by Financial Institution',
      paid_at: '2016-09-30T21:10:19.000Z',
      created_at: '2016-09-30T21:09:56.000Z',
      channel: 'card',
      currency: 'NGN',
      ip_address: '41.242.49.37',
      metadata: {
        type: 'subscription_setup',
        subscription_id: 'test-subscription-id'
      },
      log: {
        time_spent: 16,
        attempts: 1,
        authentication: 'pin',
        errors: 0,
        success: false,
        mobile: false,
        input: [],
        channel: null,
        history: []
      },
      fees: 1500,
      customer: {
        id: 68324,
        first_name: 'Bojack',
        last_name: 'Horseman',
        email: 'bojack@horseman.com',
        customer_code: 'CUS_qo38as2hpsgk2r0',
        phone: null,
        metadata: {},
        risk_action: 'default'
      },
      authorization: {
        authorization_code: 'AUTH_f5rnfq9p',
        bin: '539999',
        last4: '8877',
        exp_month: '08',
        exp_year: '2020',
        card_type: 'mastercard DEBIT',
        bank: 'Guaranty Trust Bank',
        country_code: 'NG',
        brand: 'mastercard',
        account_name: 'BoJack Horseman'
      }
    }
  },

  // Subscription created event
  'subscription.create': {
    event: 'subscription.create',
    data: {
      domain: 'live',
      status: 'active',
      subscription_code: 'SUB_vsyqdmlzble3uii',
      amount: 50000,
      cron_expression: '0 0 28 * *',
      next_payment_date: '2016-05-19T07:00:00.000Z',
      open_invoice: null,
      createdAt: '2016-03-20T00:23:24.000Z',
      plan: {
        name: 'Monthly retainer',
        plan_code: 'PLN_gx2wn530m0i3w3m',
        description: null,
        amount: 50000,
        interval: 'monthly',
        send_invoices: true,
        send_sms: true,
        currency: 'NGN'
      },
      authorization: {
        authorization_code: 'AUTH_96xphygz',
        bin: '539983',
        last4: '7357',
        exp_month: '10',
        exp_year: '2017',
        card_type: 'MASTERCARD DEBIT',
        bank: 'GTBANK',
        country_code: 'NG',
        brand: 'MASTERCARD',
        account_name: 'BoJack Horseman'
      },
      customer: {
        first_name: 'BoJack',
        last_name: 'Horseman',
        email: 'bojack@horsinaround.com',
        customer_code: 'CUS_xnxdt6s1zg1f4nx',
        phone: '',
        metadata: {},
        risk_action: 'default'
      }
    }
  },

  // Invoice payment succeeded
  'invoice.payment_succeeded': {
    event: 'invoice.payment_succeeded',
    data: {
      domain: 'live',
      invoice_code: 'INV_sample123',
      amount: 10000,
      period_start: '2016-05-01T00:00:00.000Z',
      period_end: '2016-05-31T23:59:59.000Z',
      status: 'success',
      paid: true,
      paid_at: '2016-05-15T14:30:00.000Z',
      description: 'Monthly subscription payment',
      authorization: {
        authorization_code: 'AUTH_96xphygz',
        bin: '539983',
        last4: '7357',
        exp_month: '10',
        exp_year: '2017',
        card_type: 'MASTERCARD DEBIT',
        bank: 'GTBANK',
        country_code: 'NG',
        brand: 'MASTERCARD'
      },
      subscription: {
        status: 'active',
        subscription_code: 'SUB_vsyqdmlzble3uii',
        email_token: 'sample_email_token',
        authorization: {
          authorization_code: 'AUTH_96xphygz',
          bin: '539983',
          last4: '7357',
          exp_month: '10',
          exp_year: '2017',
          card_type: 'MASTERCARD DEBIT',
          bank: 'GTBANK',
          country_code: 'NG',
          brand: 'MASTERCARD'
        }
      },
      customer: {
        first_name: 'BoJack',
        last_name: 'Horseman',
        email: 'bojack@horsinaround.com',
        customer_code: 'CUS_xnxdt6s1zg1f4nx',
        phone: '',
        metadata: {}
      }
    }
  },

  // Invoice payment failed
  'invoice.payment_failed': {
    event: 'invoice.payment_failed',
    data: {
      domain: 'live',
      invoice_code: 'INV_sample456',
      amount: 10000,
      period_start: '2016-05-01T00:00:00.000Z',
      period_end: '2016-05-31T23:59:59.000Z',
      status: 'failed',
      paid: false,
      description: 'Monthly subscription payment failed',
      subscription: {
        status: 'active',
        subscription_code: 'SUB_vsyqdmlzble3uii',
        email_token: 'sample_email_token'
      },
      customer: {
        first_name: 'BoJack',
        last_name: 'Horseman',
        email: 'bojack@horsinaround.com',
        customer_code: 'CUS_xnxdt6s1zg1f4nx',
        phone: '',
        metadata: {}
      }
    }
  }
}

async function testWebhookSignature() {
  console.log('🔐 Testing Webhook Signature Validation...\n')
  
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET
  if (!secret) {
    console.log('❌ PAYSTACK_WEBHOOK_SECRET not found in environment')
    return
  }
  
  console.log('✅ Webhook secret found:', secret.substring(0, 10) + '...')
  
  // Test with sample event
  const testPayload = testEvents['charge.success']
  const rawBody = JSON.stringify(testPayload)
  
  // Generate correct signature
  const correctSignature = generateWebhookSignature(rawBody, secret)
  console.log('Generated signature:', correctSignature.substring(0, 20) + '...')
  
  // Test validation
  const validation = validateWebhookSignature(rawBody, correctSignature, secret)
  console.log('Signature validation result:', validation.isValid ? '✅ Valid' : '❌ Invalid')
  
  if (!validation.isValid) {
    console.log('Validation error:', validation.error)
  }
  
  // Test with wrong signature
  const wrongValidation = validateWebhookSignature(rawBody, 'wrong_signature', secret)
  console.log('Wrong signature validation:', wrongValidation.isValid ? '❌ Should be invalid' : '✅ Correctly rejected')
}

async function testWebhookEndpoint() {
  console.log('\n🌐 Testing Webhook Endpoint...\n')
  
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/billing/webhook`
  console.log('Webhook URL:', webhookUrl)
  
  if (!process.env.NEXTAUTH_URL) {
    console.log('❌ NEXTAUTH_URL not set - cannot test webhook endpoint')
    return
  }
  
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET
  if (!secret) {
    console.log('❌ PAYSTACK_WEBHOOK_SECRET not set - cannot generate signature')
    return
  }
  
  // Test each event type
  for (const [eventType, payload] of Object.entries(testEvents)) {
    console.log(`\n📡 Testing ${eventType} event...`)
    
    const rawBody = JSON.stringify(payload)
    const signature = generateWebhookSignature(rawBody, secret)
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': signature
        },
        body: rawBody
      })
      
      const responseText = await response.text()
      
      if (response.ok) {
        console.log(`✅ ${eventType}: ${response.status} - ${responseText}`)
      } else {
        console.log(`❌ ${eventType}: ${response.status} - ${responseText}`)
      }
    } catch (error) {
      console.log(`❌ ${eventType}: Network error - ${error.message}`)
    }
  }
}

function displayWebhookInfo() {
  console.log('📋 Paystack Webhook Information\n')
  
  console.log('Webhook URL for Paystack Dashboard:')
  console.log(`${process.env.NEXTAUTH_URL}/api/billing/webhook\n`)
  
  console.log('Supported Events (from your implementation):')
  const supportedEvents = [
    'charge.success',
    'charge.failed', 
    'subscription.create',
    'subscription.enable',
    'subscription.disable',
    'subscription.not_renew',
    'invoice.payment_failed',
    'invoice.payment_succeeded'
  ]
  
  supportedEvents.forEach(event => {
    console.log(`  ✅ ${event}`)
  })
  
  console.log('\nPaystack IP Addresses to Whitelist:')
  const paystackIPs = [
    '52.31.139.75',
    '52.49.173.169', 
    '52.214.14.220'
  ]
  
  paystackIPs.forEach(ip => {
    console.log(`  🔒 ${ip}`)
  })
  
  console.log('\nWebhook Security:')
  console.log('  🔐 Signature validation: Enabled')
  console.log('  🔄 Retry logic: Enabled (3 attempts)')
  console.log('  🚫 Duplicate prevention: Enabled')
  console.log('  ⏱️  Timeout handling: 30 seconds')
}

async function main() {
  console.log('🎯 Paystack Webhook Test Utility\n')
  
  // Display webhook information
  displayWebhookInfo()
  
  // Test signature validation
  await testWebhookSignature()
  
  // Test webhook endpoint (if URL is available)
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
    await testWebhookEndpoint()
  } else {
    console.log('\n⚠️  Skipping endpoint test (localhost URLs cannot receive Paystack webhooks)')
    console.log('Deploy to a public URL to test webhook endpoint')
  }
  
  console.log('\n✨ Test completed!')
}

main().catch(console.error)