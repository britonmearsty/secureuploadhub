/**
 * Test API Deactivation
 * Test the actual API endpoint to see if it's working
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

// Import the SingleEmailStorageManager
const path = require('path')
const { SingleEmailStorageManager } = require('./lib/storage/single-email-manager.ts')

async function testAPIDeactivation() {
  console.log('🔍 API_TEST: Starting API deactivation test...\n')

  try {
    // Get a user with active storage accounts
    const user = await prisma.user.findFirst({
      where: {
        storageAccounts: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      include: {
        storageAccounts: {
          where: {
            provider: { in: ['google_drive', 'dropbox'] }
          }
        }
      }
    })

    if (!user) {
      console.log('❌ No users with active storage accounts found')
      return
    }

    console.log(`👤 Testing with user: ${user.email} (ID: ${user.id})`)

    // Find a Google Drive account to test with
    const googleAccount = user.storageAccounts.find(a => a.provider === 'google_drive')
    
    if (!googleAccount) {
      console.log('❌ No Google Drive account found for testing')
      return
    }

    console.log(`\n🎯 Testing API deactivation of Google Drive account:`)
    console.log(`   ID: ${googleAccount.id}`)
    console.log(`   Current Status: ${googleAccount.status}`)

    // Step 1: Call the SingleEmailStorageManager.deactivateStorageAccount method directly
    console.log('\n🔄 Step 1: Calling SingleEmailStorageManager.deactivateStorageAccount...')
    
    const result = await SingleEmailStorageManager.deactivateStorageAccount(
      user.id,
      'google'
    )

    console.log('API Result:', result)

    // Step 2: Verify the change in database
    console.log('\n🔍 Step 2: Verifying database state...')
    
    const updatedAccount = await prisma.storageAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'google_drive'
      }
    })

    if (updatedAccount) {
      console.log(`   Status: ${updatedAccount.status}`)
      console.log(`   IsActive: ${updatedAccount.isActive}`)
      console.log(`   Last Error: ${updatedAccount.lastError}`)
      console.log(`   Updated At: ${updatedAccount.updatedAt}`)
    }

    // Step 3: Test the accounts API response
    console.log('\n🔍 Step 3: Testing getSimplifiedConnectedAccounts...')
    
    const accounts = await SingleEmailStorageManager.getSimplifiedConnectedAccounts(user.id)
    console.log('Simplified accounts:', accounts.map(a => ({
      provider: a.provider,
      status: a.status,
      isActive: a.isActive
    })))

    // Step 4: Test OAuth status
    console.log('\n🔍 Step 4: Testing OAuth status...')
    
    const hasGoogleOAuth = await SingleEmailStorageManager.hasOAuthAccess(user.id, 'google')
    const hasDropboxOAuth = await SingleEmailStorageManager.hasOAuthAccess(user.id, 'dropbox')
    
    console.log(`   Google OAuth: ${hasGoogleOAuth}`)
    console.log(`   Dropbox OAuth: ${hasDropboxOAuth}`)

    // Step 5: Reactivate for next test
    console.log('\n🔄 Step 5: Reactivating for next test...')
    
    const reactivateResult = await SingleEmailStorageManager.reactivateStorageAccount(
      user.id,
      'google'
    )

    console.log('Reactivate Result:', reactivateResult)

  } catch (error) {
    console.error('❌ Error during API test:', error)
    console.error('Stack trace:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testAPIDeactivation()