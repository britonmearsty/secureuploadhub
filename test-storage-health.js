// Test script to verify storage health check functionality
// Run with: node test-storage-health.js

const BASE_URL = 'http://localhost:3000'

async function testHealthCheck() {
  console.log('🔍 Testing Storage Health Check API...\n')
  
  try {
    // Test the health check endpoint
    const response = await fetch(`${BASE_URL}/api/storage/health-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would need proper authentication
        // For testing, we'll see if the endpoint responds correctly to unauthorized requests
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    if (response.status === 401) {
      console.log('✅ Endpoint correctly requires authentication')
      return
    }
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Health check completed successfully')
      console.log(`📊 Checked ${data.checkedAccounts} storage accounts`)
      
      if (data.results && data.results.length > 0) {
        console.log('\n📋 Results:')
        data.results.forEach((result, index) => {
          console.log(`  ${index + 1}. Account ${result.accountId} (${result.provider}):`)
          console.log(`     Status: ${result.previousStatus} → ${result.newStatus}`)
          if (result.error) {
            console.log(`     Error: ${result.error}`)
          }
        })
      }
    } else {
      console.log('❌ Health check failed:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testHealthCheck()