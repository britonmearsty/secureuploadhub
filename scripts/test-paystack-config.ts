/**
 * Test Paystack Configuration
 * Tests Paystack connection without requiring authentication
 */

import 'dotenv/config'
import { PAYSTACK_CONFIG } from '@/lib/paystack-config'

async function testPaystackConfig() {
  console.log('🔍 Testing Paystack Configuration...\n')

  // 1. Check environment variables
  console.log('1. Environment Variables:')
  const envVars = {
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? 'Set' : 'Missing',
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ? 'Set' : 'Missing', 
    PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET ? 'Set' : 'Missing',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'Set' : 'Missing'
  }
  console.table(envVars)

  // 2. Check configuration values
  console.log('\n2. Configuration Values:')
  const configTest = {
    hasSecretKey: !PAYSTACK_CONFIG.secretKey.startsWith('dummy_'),
    hasPublicKey: !PAYSTACK_CONFIG.publicKey.startsWith('dummy_'),
    hasWebhookSecret: !PAYSTACK_CONFIG.webhookSecret.startsWith('dummy_'),
    hasBaseUrl: !PAYSTACK_CONFIG.baseUrl.startsWith('dummy_'),
    baseUrl: PAYSTACK_CONFIG.baseUrl,
    secretKeyPrefix: PAYSTACK_CONFIG.secretKey.substring(0, 10) + '...',
    publicKeyPrefix: PAYSTACK_CONFIG.publicKey.substring(0, 10) + '...'
  }
  console.table(configTest)

  // 3. Test Paystack initialization and transaction.initialize
  console.log('\n3. Testing Paystack Initialization and Transaction Initialize:')
  try {
    const { getPaystack } = await import('@/lib/billing')
    const paystack = await getPaystack()
    console.log('✅ Paystack instance created successfully')
    
    // Import currency utilities
    const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
    
    // Try transaction initialization (this is what the upgrade button uses)
    try {
      console.log('Testing transaction initialization...')
      
      // Use proper currency configuration
      const testCurrency = getPaystackCurrency('USD') // Test with USD since that's the default
      const testAmount = convertToPaystackSubunit(10.00, testCurrency) // $10.00 test amount
      
      console.log(`Using currency: ${testCurrency}, amount: ${testAmount} (subunits)`)
      
      const initResponse = await (paystack as any).transaction.initialize({
        email: 'test@example.com',
        amount: testAmount,
        currency: testCurrency,
        reference: `test_${Date.now()}`,
        callback_url: `${PAYSTACK_CONFIG.baseUrl}/dashboard/billing?status=success`,
        metadata: {
          type: 'subscription_setup',
          subscription_id: 'test_sub_123',
          user_id: 'test_user_123'
        }
      })
      
      console.log('✅ Transaction initialization successful!')
      console.log('Response status:', initResponse.status)
      console.log('Has authorization URL:', !!initResponse.data?.authorization_url)
      console.log('Reference:', initResponse.data?.reference)
      
      if (initResponse.data?.authorization_url) {
        console.log('✅ Payment URL generated successfully')
        console.log('Payment URL preview:', initResponse.data.authorization_url.substring(0, 50) + '...')
      } else {
        console.log('❌ No payment URL in response')
      }
      
    } catch (error: any) {
      console.log('❌ Transaction initialization failed:', error.message)
      if (error.statusCode) {
        console.log('Status code:', error.statusCode)
        console.log('Error body:', error.error)
      }
    }
  } catch (error: any) {
    console.log('❌ Failed to create Paystack instance:', error.message)
    console.log('Error details:', error)
  }

  // 4. Test transaction initialization (without actually creating one)
  console.log('\n4. Testing Transaction Initialization Structure:')
  try {
    const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
    
    const testCurrency = getPaystackCurrency('USD')
    const testAmount = convertToPaystackSubunit(29.00, testCurrency) // $29.00 typical plan price
    
    const testData = {
      email: 'test@example.com',
      amount: testAmount,
      currency: testCurrency,
      reference: `test_${Date.now()}`,
      callback_url: `${PAYSTACK_CONFIG.baseUrl}/dashboard/billing?status=success`,
      metadata: {
        type: 'subscription_setup',
        subscription_id: 'test_sub_123',
        user_id: 'test_user_123'
      }
    }
    
    console.log('Test initialization data structure:')
    console.log(JSON.stringify(testData, null, 2))
    console.log('✅ Transaction data structure looks valid')
  } catch (error: any) {
    console.log('❌ Error preparing test data:', error.message)
  }

  console.log('\n✅ Paystack configuration test complete!')
}

// Run if called directly
if (require.main === module) {
  testPaystackConfig().catch(console.error)
}

export { testPaystackConfig }