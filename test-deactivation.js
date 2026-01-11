/**
 * Test Deactivation Script
 * Manually test the deactivation functionality
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function testDeactivation() {
  console.log('🔍 TEST: Starting deactivation test...\n')

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
    console.log(`   Storage accounts: ${user.storageAccounts.length}`)

    // Find a Google Drive account to test with
    const googleAccount = user.storageAccounts.find(a => a.provider === 'google_drive')
    
    if (!googleAccount) {
      console.log('❌ No Google Drive account found for testing')
      return
    }

    console.log(`\n🎯 Testing deactivation of Google Drive account:`)
    console.log(`   ID: ${googleAccount.id}`)
    console.log(`   Current Status: ${googleAccount.status}`)
    console.log(`   Current IsActive: ${googleAccount.isActive}`)

    // Step 1: Manually deactivate using the same logic as the API
    console.log('\n🔄 Step 1: Deactivating storage account...')
    
    const result = await prisma.storageAccount.updateMany({
      where: {
        userId: user.id,
        provider: 'google_drive'
      },
      data: {
        status: 'INACTIVE',
        isActive: false,
        lastError: "Deactivated by test script",
        updatedAt: new Date()
      }
    })

    console.log(`✅ Updated ${result.count} storage account(s)`)

    // Step 2: Verify the change
    console.log('\n🔍 Step 2: Verifying deactivation...')
    
    const updatedAccount = await prisma.storageAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'google_drive'
      }
    })

    if (updatedAccount) {
      console.log(`   New Status: ${updatedAccount.status}`)
      console.log(`   New IsActive: ${updatedAccount.isActive}`)
      console.log(`   Last Error: ${updatedAccount.lastError}`)
      console.log(`   Updated At: ${updatedAccount.updatedAt}`)
    }

    // Step 3: Test what the API would return
    console.log('\n🔍 Step 3: Testing API response simulation...')
    
    const accounts = await prisma.storageAccount.findMany({
      where: {
        userId: user.id,
        provider: { in: ['google_drive', 'dropbox'] }
      },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        status: true,
        isActive: true,
        lastAccessedAt: true,
        createdAt: true
      }
    })

    console.log('   API would return:')
    accounts.forEach(account => {
      const provider = account.provider === 'google_drive' ? 'google' : 'dropbox'
      const isActive = account.status === 'ACTIVE'
      
      console.log(`   - ${provider}: Status=${account.status}, IsActive=${isActive}`)
    })

    // Step 4: Reactivate for next test
    console.log('\n🔄 Step 4: Reactivating for next test...')
    
    await prisma.storageAccount.updateMany({
      where: {
        userId: user.id,
        provider: 'google_drive'
      },
      data: {
        status: 'ACTIVE',
        isActive: true,
        lastError: null,
        updatedAt: new Date()
      }
    })

    console.log('✅ Reactivated storage account')

  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDeactivation()