/**
 * Debug Storage Accounts Script
 * Run this to check the current state of storage accounts and OAuth accounts
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugStorageAccounts() {
  console.log('🔍 DEBUG: Starting storage accounts analysis...\n')

  try {
    // Get all users with their OAuth accounts and storage accounts
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          where: {
            provider: { in: ['google', 'dropbox'] }
          },
          select: {
            provider: true,
            providerAccountId: true,
            access_token: true,
            refresh_token: true,
            expires_at: true
          }
        },
        storageAccounts: {
          where: {
            provider: { in: ['google_drive', 'dropbox'] }
          },
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            email: true,
            displayName: true,
            status: true,
            isActive: true,
            lastError: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    console.log(`📊 Found ${users.length} users\n`)

    for (const user of users) {
      console.log(`👤 User: ${user.email} (ID: ${user.id})`)
      console.log(`   OAuth Accounts: ${user.accounts.length}`)
      console.log(`   Storage Accounts: ${user.storageAccounts.length}`)

      // Check OAuth accounts
      for (const account of user.accounts) {
        const hasToken = !!account.access_token
        const hasRefresh = !!account.refresh_token
        const isExpired = account.expires_at ? account.expires_at < Math.floor(Date.now() / 1000) : false
        
        console.log(`   🔐 OAuth ${account.provider}:`)
        console.log(`      Provider Account ID: ${account.providerAccountId}`)
        console.log(`      Has Access Token: ${hasToken}`)
        console.log(`      Has Refresh Token: ${hasRefresh}`)
        console.log(`      Token Expired: ${isExpired}`)
      }

      // Check storage accounts
      for (const storage of user.storageAccounts) {
        console.log(`   💾 Storage ${storage.provider}:`)
        console.log(`      ID: ${storage.id}`)
        console.log(`      Provider Account ID: ${storage.providerAccountId}`)
        console.log(`      Email: ${storage.email}`)
        console.log(`      Status: ${storage.status}`)
        console.log(`      IsActive (deprecated): ${storage.isActive}`)
        console.log(`      Last Error: ${storage.lastError || 'None'}`)
        console.log(`      Created: ${storage.createdAt}`)
        console.log(`      Updated: ${storage.updatedAt}`)
      }

      // Check for mismatches
      const oauthProviders = user.accounts.map(a => a.provider === 'google' ? 'google_drive' : 'dropbox')
      const storageProviders = user.storageAccounts.map(s => s.provider)
      
      const missingStorage = oauthProviders.filter(p => !storageProviders.includes(p))
      const orphanedStorage = storageProviders.filter(p => !oauthProviders.includes(p))

      if (missingStorage.length > 0) {
        console.log(`   ⚠️  Missing storage accounts for: ${missingStorage.join(', ')}`)
      }
      if (orphanedStorage.length > 0) {
        console.log(`   ⚠️  Orphaned storage accounts for: ${orphanedStorage.join(', ')}`)
      }

      console.log('')
    }

    // Summary statistics
    const totalOAuthAccounts = users.reduce((sum, u) => sum + u.accounts.length, 0)
    const totalStorageAccounts = users.reduce((sum, u) => sum + u.storageAccounts.length, 0)
    const activeStorageAccounts = users.reduce((sum, u) => 
      sum + u.storageAccounts.filter(s => s.status === 'ACTIVE').length, 0
    )
    const inactiveStorageAccounts = users.reduce((sum, u) => 
      sum + u.storageAccounts.filter(s => s.status === 'INACTIVE').length, 0
    )

    console.log('📈 SUMMARY:')
    console.log(`   Total OAuth Accounts: ${totalOAuthAccounts}`)
    console.log(`   Total Storage Accounts: ${totalStorageAccounts}`)
    console.log(`   Active Storage Accounts: ${activeStorageAccounts}`)
    console.log(`   Inactive Storage Accounts: ${inactiveStorageAccounts}`)

  } catch (error) {
    console.error('❌ Error during debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug
debugStorageAccounts()