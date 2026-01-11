/**
 * Paystack Webhook Event Simulator
 * Simulates webhook events locally for testing
 */

require('dotenv').config()
const crypto = require('crypto')

// Generate webhook signature
function generateSignature(payload, secret) {
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
}

// Simulate webhook events
async function simulateWebhookEvent(eventType, customData = {}) {
  const webhookUrl = 'http://localhost:3000/api/billing/webhook'
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET
  
  if (!secret) {
    console.log('❌ PAYSTACK_WEBHOOK_SECRET not found')
    return
  }
  
  // Base event templates
  const eventTemplates = {
    'charge.success': {
      event: 'charge.success',
      data: {
        id: Date.now(),
        domain: 'test',
        status: 'success',
        reference: `test_ref_${Date.now()}`,
        amount: 10000, // 100.00 in kobo
        currency: 'NGN',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'card',
        gateway_response: 'Approved by Financial Institution',
        metadata: {
          type: 'subscription_setup',
          subscription_id: 'test-subscription-id',
          ...customData.metadata
        },
        customer: {
          id: 12345,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          customer_code: 'CUS_test123',
          ...customData.customer
        },
        authorization: {
          authorization_code: 'AUTH_test123',
          bin: '539999',
          last4: '1234',
          exp_month: '12',
          exp_year: '2025',
          card_type: 'visa',
          bank: 'Test Bank',
          country_code: 'NG',
          brand: 'visa',
          ...customData.authorization
        },
        ...customData
      }
    },
    
    'subscription.create': {
      event: 'subscription.create',
      data: {
        domain: 'test',
        status: 'active',
        subscription_code: `SUB_test_${Date.now()}`,
        amount: 10000,
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        plan: {
          name: 'Test Plan',
          plan_code: 'PLN_test123',
          amount: 10000,
          interval: 'monthly',
          currency: 'NGN'
        },
        customer: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          customer_code: 'CUS_test123'
        },
        ...customData
      }
    },
    
    'invoice.payment_succeeded': {
      event: 'invoice.payment_succeeded',
      data: {
        domain: 'test',
        invoice_code: `INV_test_${Date.now()}`,
        amount: 10000,
        status: 'success',
        paid: true,
        paid_at: new Date().toISOString(),
        reference: `inv_ref_${Date.now()}`,
        subscription: {
          status: 'active',
          subscription_code: `SUB_test_${Date.now()}`,
          authorization: {
            authorization_code: 'AUTH_test123'
          }
        },
        customer: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          customer_code: 'CUS_test123'
        },
        ...customData
      }
    },
    
    'invoice.payment_failed': {
      event: 'invoice.payment_failed',
      data: {
        domain: 'test',
        invoice_code: `INV_failed_${Date.now()}`,
        amount: 10000,
        status: 'failed',
        paid: false,
        reference: `failed_ref_${Date.now()}`,
        subscription: {
          status: 'active',
          subscription_code: `SUB_test_${Date.now()}`
        },
        customer: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          customer_code: 'CUS_test123'
        },
        ...customData
      }
    }
  }
  
  const payload = eventTemplates[eventType]
  if (!payload) {
    console.log(`❌ Unknown event type: ${eventType}`)
    return
  }
  
  // Merge custom data
  if (customData) {
    payload.data = { ...payload.data, ...customData }
  }
  
  const rawBody = JSON.stringify(payload)
  const signature = generateSignature(rawBody, secret)
  
  console.log(`📡 Simulating ${eventType} event...`)
  console.log(`Reference: ${payload.data.reference || payload.data.subscription_code}`)
  
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
      console.log(`✅ Success: ${response.status} - ${responseText}`)
    } else {
      console.log(`❌ Error: ${response.status} - ${responseText}`)
    }
    
    return { success: response.ok, status: response.status, response: responseText }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Test scenarios
async function runTestScenarios() {
  console.log('🧪 Running Webhook Test Scenarios\n')
  
  // Scenario 1: Successful charge for subscription setup
  console.log('📋 Scenario 1: Successful subscription setup payment')
  await simulateWebhookEvent('charge.success', {
    reference: 'setup_payment_001',
    metadata: {
      type: 'subscription_setup',
      subscription_id: 'your-subscription-id-here' // Replace with actual subscription ID
    },
    customer: {
      email: 'test@example.com' // Replace with actual user email
    }
  })
  
  await new Promise(r => setTimeout(r, 1000)) // Wait 1 second
  
  // Scenario 2: Subscription creation
  console.log('\n📋 Scenario 2: Subscription creation')
  await simulateWebhookEvent('subscription.create', {
    subscription_code: 'SUB_test_create_001',
    customer: {
      customer_code: 'CUS_test123',
      email: 'test@example.com'
    }
  })
  
  await new Promise(r => setTimeout(r, 1000))
  
  // Scenario 3: Invoice payment success
  console.log('\n📋 Scenario 3: Invoice payment succeeded')
  await simulateWebhookEvent('invoice.payment_succeeded', {
    reference: 'invoice_payment_001',
    subscription: {
      subscription_code: 'SUB_test_create_001'
    },
    customer: {
      email: 'test@example.com'
    }
  })
  
  await new Promise(r => setTimeout(r, 1000))
  
  // Scenario 4: Invoice payment failure
  console.log('\n📋 Scenario 4: Invoice payment failed')
  await simulateWebhookEvent('invoice.payment_failed', {
    reference: 'failed_invoice_001',
    subscription: {
      subscription_code: 'SUB_test_create_001'
    },
    customer: {
      email: 'test@example.com'
    }
  })
}

// Interactive mode
async function interactiveMode() {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  console.log('🎮 Interactive Webhook Simulator')
  console.log('Available events: charge.success, subscription.create, invoice.payment_succeeded, invoice.payment_failed')
  console.log('Type "exit" to quit, "scenarios" to run test scenarios\n')
  
  const askQuestion = () => {
    rl.question('Enter event type (or command): ', async (eventType) => {
      if (eventType.toLowerCase() === 'exit') {
        rl.close()
        return
      }
      
      if (eventType.toLowerCase() === 'scenarios') {
        await runTestScenarios()
        askQuestion()
        return
      }
      
      if (['charge.success', 'subscription.create', 'invoice.payment_succeeded', 'invoice.payment_failed'].includes(eventType)) {
        await simulateWebhookEvent(eventType)
      } else {
        console.log('❌ Invalid event type')
      }
      
      askQuestion()
    })
  }
  
  askQuestion()
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('🎯 Paystack Webhook Event Simulator\n')
    console.log('Usage:')
    console.log('  node simulate-webhook-events.js <event-type>')
    console.log('  node simulate-webhook-events.js interactive')
    console.log('  node simulate-webhook-events.js scenarios')
    console.log('\nAvailable events:')
    console.log('  - charge.success')
    console.log('  - subscription.create')
    console.log('  - invoice.payment_succeeded')
    console.log('  - invoice.payment_failed')
    return
  }
  
  const command = args[0]
  
  if (command === 'interactive') {
    await interactiveMode()
  } else if (command === 'scenarios') {
    await runTestScenarios()
  } else {
    await simulateWebhookEvent(command)
  }
}

main().catch(console.error)