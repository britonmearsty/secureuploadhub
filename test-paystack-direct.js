/**
 * Direct test of Paystack configuration
 */

require('dotenv').config()

async function testPaystackConfig() {
  console.log('🔍 Testing Paystack Configuration...\n')
  
  // Check environment variables
  console.log('Environment Variables:')
  console.log('- PAYSTACK_SECRET_KEY:', process.env.PAYSTACK_SECRET_KEY ? 'Set ✅' : 'Missing ❌')
  console.log('- PAYSTACK_PUBLIC_KEY:', process.env.PAYSTACK_PUBLIC_KEY ? 'Set ✅' : 'Missing ❌')
  console.log('- PAYSTACK_WEBHOOK_SECRET:', process.env.PAYSTACK_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌')
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'Set ✅' : 'Missing ❌')
  
  // Show actual values (first 10 chars)
  console.log('\nActual Values (first 10 chars):')
  console.log('- PAYSTACK_SECRET_KEY:', process.env.PAYSTACK_SECRET_KEY?.substring(0, 10) + '...')
  console.log('- PAYSTACK_PUBLIC_KEY:', process.env.PAYSTACK_PUBLIC_KEY?.substring(0, 10) + '...')
  console.log('- PAYSTACK_WEBHOOK_SECRET:', process.env.PAYSTACK_WEBHOOK_SECRET?.substring(0, 10) + '...')
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
  
  // Test Paystack initialization
  console.log('\n🔧 Testing Paystack Initialization...')
  try {
    // Test Paystack API directly
    const paystackModule = require('paystack-api')
    const PaystackConstructor = paystackModule.default || paystackModule
    const paystack = new PaystackConstructor(process.env.PAYSTACK_SECRET_KEY)
    
    console.log('✅ Paystack instance created successfully')
    
    // Test with a dummy transaction verification (should fail but show API is working)
    console.log('\n💳 Testing Paystack API connection...')
    try {
      const verifyResult = await paystack.transaction.verify('dummy_reference')
      console.log('❌ Unexpected success with dummy reference')
    } catch (error) {
      if (error.message && (error.message.includes('Transaction not found') || 
          error.message.includes('No transaction found') || 
          error.message.includes('Invalid transaction reference'))) {
        console.log('✅ Paystack API is working (expected error for dummy reference)')
      } else {
        console.log('❌ Paystack API error:', error.message || error)
        console.log('Error details:', error)
        // Continue anyway - this might be a version-specific issue
        console.log('⚠️  Continuing with transaction initialization test...')
      }
    }
    
    // Test transaction initialization
    console.log('\n🚀 Testing Transaction Initialization...')
    try {
      const initResponse = await paystack.transaction.initialize({
        email: 'test@example.com',
        amount: 1000, // 10.00 in kobo/cents
        currency: 'USD',
        reference: `test_${Date.now()}`,
        callback_url: `${process.env.NEXTAUTH_URL}/test-callback`
      })
      
      if (initResponse.status && initResponse.data.authorization_url) {
        console.log('✅ Transaction initialization successful')
        console.log('✅ Payment URL generated successfully')
        console.log('Payment URL:', initResponse.data.authorization_url.substring(0, 50) + '...')
        console.log('\n🎉 PAYSTACK CONFIGURATION IS WORKING CORRECTLY!')
      } else {
        console.log('❌ Transaction initialization failed:', initResponse.message)
      }
    } catch (error) {
      console.log('❌ Transaction initialization error:', error.message)
      console.log('Full error:', error)
    }
    
  } catch (error) {
    console.log('❌ Paystack initialization error:', error.message)
  }
}

testPaystackConfig().catch(console.error)