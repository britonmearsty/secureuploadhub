/**
 * Fix Storage Connections Script
 * Run this to fix existing storage account issues
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixStorageConnections() {
  console.log('🔧 FIX: Starting storage connections repair...\n')

  try {
    // Get all users with OAuth accounts but potentially missing/broken storage accounts
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          where: {
            provider: { in: ['google', 'dropbox'] }
          }
        },
        storageAccounts: {
          where: {
            provider: { in: ['google_drive', 'dropbox'] }
          }
        }
      }
    })

    console.log(`👥 Processing ${users.length} users...\n`)

    let fixedCount = 0
    let createdCount = 0
    let reactivatedCount = 0

    for (const user of users) {
      console.log(`👤 Processing user: ${user.email}`)

      for (const oauthAccount of user.accounts) {
        const storageProvider = oauthAccount.provider === 'google' ? 'google_drive' : 'dropbox'
        
        // Find corresponding storage account
        const existingStorage = user.storageAccounts.find(s => 
          s.provider === storageProvider && 
          s.providerAccountId === oauthAccount.providerAccountId
        )

        if (!existingStorage) {
          // Create missing storage account
          console.log(`   ➕ Creating missing storage account for ${oauthAccount.provider}`)
          
          try {
            const newStorage = await prisma.storageAccount.create({
              data: {
                userId: user.id,
                provider: storageProvider,
                providerAccountId: oauthAccount.providerAccountId,
                displayName: user.name || `${oauthAccount.provider} Account`,
                email: user.email,
                status: 'ACTIVE',
                isActive: true,
                createdAt: oauthAccount.createdAt || new Date(),
                updatedAt: new Date(),
                lastAccessedAt: new Date()
              }
            })
            
            console.log(`   ✅ Created storage account: ${newStorage.id}`)
            createdCount++
            fixedCount++
          } catch (error) {
            console.log(`   ❌ Failed to create storage account: ${error.message}`)
          }
        } else if (existingStorage.status !== 'ACTIVE') {
          // Reactivate inactive storage account
          console.log(`   🔄 Reactivating ${oauthAccount.provider} storage (status: ${existingStorage.status})`)
          
          try {
            await prisma.storageAccount.update({
              where: { id: existingStorage.id },
              data: {
                status: 'ACTIVE',
                isActive: true,
                lastError: null,
                lastAccessedAt: new Date(),
                updatedAt: new Date(),
                email: user.email // Ensure email matches login email
              }
            })
            
            console.log(`   ✅ Reactivated storage account: ${existingStorage.id}`)
            reactivatedCount++
            fixedCount++
          } catch (error) {
            console.log(`   ❌ Failed to reactivate storage account: ${error.message}`)
          }
        } else {
          // Update email to ensure it matches login email
          if (existingStorage.email !== user.email) {
            console.log(`   📧 Updating email for ${oauthAccount.provider} storage`)
            
            try {
              await prisma.storageAccount.update({
                where: { id: existingStorage.id },
                data: {
                  email: user.email,
                  updatedAt: new Date()
                }
              })
              
              console.log(`   ✅ Updated email for storage account: ${existingStorage.id}`)
              fixedCount++
            } catch (error) {
              console.log(`   ❌ Failed to update email: ${error.message}`)
            }
          } else {
            console.log(`   ✅ ${oauthAccount.provider} storage account is already active and correct`)
          }
        }
      }

      console.log('')
    }

    console.log('🎉 REPAIR COMPLETE:')
    console.log(`   Total fixes applied: ${fixedCount}`)
    console.log(`   Storage accounts created: ${createdCount}`)
    console.log(`   Storage accounts reactivated: ${reactivatedCount}`)

  } catch (error) {
    console.error('❌ Error during repair:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixStorageConnections()