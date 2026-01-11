/**
 * Test HTTP Deactivation
 * Test the actual HTTP API endpoint
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function testHTTPDeactivation() {
  console.log('🔍 HTTP_TEST: Starting HTTP API deactivation test...\n')

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

    console.log(`\n🎯 Before deactivation:`)
    console.log(`   Google Drive Status: ${googleAccount.status}`)
    console.log(`   Google Drive IsActive: ${googleAccount.isActive}`)

    // Step 1: Start the Next.js server in the background for testing
    console.log('\n🔄 Step 1: You need to start the Next.js server manually')
    console.log('   Run: npm run dev or pnpm dev in another terminal')
    console.log('   Then press Enter to continue...')
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve())
    })

    // Step 2: Make HTTP request to deactivate endpoint
    console.log('\n🔄 Step 2: Making HTTP request to deactivate endpoint...')
    
    try {
      const response = await fetch('http://localhost:3000/api/storage/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: This won't work without proper authentication
          // We'll need to check the logs instead
        },
        body: JSON.stringify({ provider: 'google' })
      })

      console.log(`   Response Status: ${response.status}`)
      const responseData = await response.json()
      console.log(`   Response Data:`, responseData)

    } catch (fetchError) {
      console.log('❌ HTTP request failed (expected without auth):', fetchError.message)
      console.log('   This is expected since we don\'t have authentication')
    }

    // Step 3: Check database state after potential deactivation
    console.log('\n🔍 Step 3: Checking database state...')
    
    const updatedAccount = await prisma.storageAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'google_drive'
      }
    })

    if (updatedAccount) {
      console.log(`   Google Drive Status: ${updatedAccount.status}`)
      console.log(`   Google Drive IsActive: ${updatedAccount.isActive}`)
      console.log(`   Last Error: ${updatedAccount.lastError}`)
      console.log(`   Updated At: ${updatedAccount.updatedAt}`)
    }

    // Step 4: Check all storage accounts
    console.log('\n🔍 Step 4: All storage accounts for user:')
    
    const allAccounts = await prisma.storageAccount.findMany({
      where: {
        userId: user.id,
        provider: { in: ['google_drive', 'dropbox'] }
      },
      select: {
        provider: true,
        status: true,
        isActive: true,
        updatedAt: true
      }
    })

    allAccounts.forEach(account => {
      console.log(`   ${account.provider}: Status=${account.status}, IsActive=${account.isActive}, Updated=${account.updatedAt}`)
    })

  } catch (error) {
    console.error('❌ Error during HTTP test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testHTTPDeactivation()