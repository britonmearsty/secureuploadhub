/**
 * Test Complete Deactivation Flow
 * Test the complete flow: deactivate -> fetch accounts -> verify status
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function testCompleteFlow() {
  console.log('🔍 COMPLETE_FLOW_TEST: Starting complete deactivation flow test...\n')

  try {
    // Get the user with active storage account
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
    console.log(`📊 Initial Status: ${storageAccount.status}`)

    // Step 1: Simulate the deactivation API call
    console.log('\n🔄 Step 1: Simulating deactivation API call...')
    
    const deactivateResult = await prisma.storageAccount.updateMany({
      where: {
        userId: user.id,
        provider: 'google_drive'
      },
      data: {
        status: 'INACTIVE',
        isActive: false,
        lastError: "Deactivated by user",
        updatedAt: new Date()
      }
    })

    console.log(`✅ Deactivated ${deactivateResult.count} storage account(s)`)

    // Step 2: Simulate fetchAccounts() - get simplified connected accounts
    console.log('\n🔄 Step 2: Simulating fetchAccounts() call...')
    
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

    console.log('📊 Accounts returned by API simulation:')
    accounts.forEach(account => {
      const provider = account.provider === 'google_drive' ? 'google' : 'dropbox'
      const isActive = account.status === 'ACTIVE'
      
      console.log(`   - ${provider}: Status=${account.status}, IsActive=${isActive}, LastError=${account.lastError || 'None'}`)
    })

    // Step 3: Simulate OAuth status check
    console.log('\n🔄 Step 3: Simulating OAuth status check...')
    
    const oauthAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'google'
      },
      select: {
        access_token: true,
        expires_at: true
      }
    })

    if (oauthAccount) {
      const hasToken = !!oauthAccount.access_token
      const isExpired = oauthAccount.expires_at ? oauthAccount.expires_at < Math.floor(Date.now() / 1000) - 60 : false
      const hasValidOAuth = hasToken && !isExpired
      
      console.log(`   OAuth Status: hasToken=${hasToken}, isExpired=${isExpired}, hasValidOAuth=${hasValidOAuth}`)
    }

    // Step 4: Simulate what the UI would show
    console.log('\n🔄 Step 4: Simulating UI state...')
    
    const finalAccount = accounts.find(a => a.provider === 'google_drive')
    if (finalAccount) {
      const shouldShowDeactivateButton = finalAccount.status === 'ACTIVE'
      const shouldShowReactivateButton = finalAccount.status === 'INACTIVE'
      
      console.log(`   UI would show:`)
      console.log(`   - Storage Status: ${finalAccount.status}`)
      console.log(`   - Show Deactivate Button: ${shouldShowDeactivateButton}`)
      console.log(`   - Show Reactivate Button: ${shouldShowReactivateButton}`)
      
      if (shouldShowReactivateButton) {
        console.log('✅ SUCCESS: UI would correctly show Reactivate button!')
      } else {
        console.log('❌ FAILURE: UI would still show Deactivate button')
      }
    }

    // Step 5: Clean up
    console.log('\n🔄 Step 5: Cleaning up...')
    
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
testCompleteFlow()