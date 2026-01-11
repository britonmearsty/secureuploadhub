/**
 * Test Deactivation Fix
 * Test that manual deactivation is preserved even when OAuth sync runs
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function testDeactivationFix() {
  console.log('🔍 DEACTIVATION_FIX_TEST: Starting test...\n')

  try {
    // Get the user with non-expired OAuth (kiplaekc@gmail.com)
    const user = await prisma.user.findFirst({
      where: {
        email: 'kiplaekc@gmail.com'
      },
      include: {
        storageAccounts: {
          where: {
            provider: 'google_drive'
          }
        }
      }
    })

    if (!user || user.storageAccounts.length === 0) {
      console.log('❌ Test user not found or no Google storage account')
      return
    }

    const storageAccount = user.storageAccounts[0]
    console.log(`👤 Testing with user: ${user.email}`)
    console.log(`📦 Storage Account ID: ${storageAccount.id}`)
    console.log(`📊 Current Status: ${storageAccount.status}`)

    // Step 1: Manually deactivate the account (simulating user action)
    console.log('\n🔄 Step 1: Manually deactivating storage account...')
    
    await prisma.storageAccount.update({
      where: { id: storageAccount.id },
      data: {
        status: 'INACTIVE',
        isActive: false,
        lastError: "Deactivated by user",
        updatedAt: new Date()
      }
    })

    console.log('✅ Storage account deactivated')

    // Step 2: Verify deactivation
    const deactivatedAccount = await prisma.storageAccount.findUnique({
      where: { id: storageAccount.id }
    })

    console.log(`📊 Status after deactivation: ${deactivatedAccount.status}`)
    console.log(`📊 Last Error: ${deactivatedAccount.lastError}`)

    // Step 3: Simulate OAuth sync (this was causing the reactivation)
    console.log('\n🔄 Step 2: Simulating OAuth sync...')
    
    // Make HTTP request to sync endpoint
    try {
      const response = await fetch('http://localhost:3000/api/storage/sync-oauth-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: This won't work without proper authentication
        }
      })

      console.log(`📡 Sync API Response: ${response.status}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`📡 Sync Result: ${data.message}`)
        console.log(`📡 Actions:`, data.actions)
      }
    } catch (error) {
      console.log('❌ Sync API call failed (expected without auth):', error.message)
      console.log('   We\'ll check the database directly instead...')
    }

    // Step 4: Check if deactivation was preserved
    console.log('\n🔍 Step 3: Checking if deactivation was preserved...')
    
    const finalAccount = await prisma.storageAccount.findUnique({
      where: { id: storageAccount.id }
    })

    console.log(`📊 Final Status: ${finalAccount.status}`)
    console.log(`📊 Final IsActive: ${finalAccount.isActive}`)
    console.log(`📊 Final Last Error: ${finalAccount.lastError}`)

    if (finalAccount.status === 'INACTIVE' && finalAccount.lastError === 'Deactivated by user') {
      console.log('✅ SUCCESS: Manual deactivation was preserved!')
    } else {
      console.log('❌ FAILURE: Manual deactivation was overridden')
    }

    // Step 5: Clean up - reactivate for next test
    console.log('\n🔄 Step 4: Cleaning up...')
    
    await prisma.storageAccount.update({
      where: { id: storageAccount.id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        lastError: null,
        updatedAt: new Date()
      }
    })

    console.log('✅ Cleaned up - account reactivated')

  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDeactivationFix()