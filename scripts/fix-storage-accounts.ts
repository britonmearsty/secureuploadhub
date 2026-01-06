#!/usr/bin/env tsx

/**
 * Fix Script: Storage Account Issues
 * 
 * This script fixes common storage account issues that cause
 * "No active google_drive storage account available" errors
 * 
 * Run with: npx tsx scripts/fix-storage-accounts.ts [--dry-run] [user-email]
 */

import { config } from "dotenv"
config() // Load environment variables

import prisma from "../lib/prisma"
import { StorageAccountStatus } from "@prisma/client"
import { validateStorageConnection } from "../lib/storage"

interface FixResult {
  usersProcessed: number
  storageAccountsCreated: number
  storageAccountsReactivated: number
  storageAccountsDisconnected: number
  errors: string[]
}

async function fixUserStorageAccounts(userEmail: string, dryRun: boolean = false): Promise<FixResult> {
  const result: FixResult = {
    usersProcessed: 0,
    storageAccountsCreated: 0,
    storageAccountsReactivated: 0,
    storageAccountsDisconnected: 0,
    errors: []
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        accounts: {
          where: { provider: { in: ["google", "dropbox"] } }
        },
        storageAccounts: true
      }
    })

    if (!user) {
      result.errors.push(`User not found: ${userEmail}`)
      return result
    }

    console.log(`🔧 Fixing storage accounts for: ${user.email}`)
    result.usersProcessed = 1

    // Fix 1: Create missing StorageAccount records
    for (const oauthAccount of user.accounts) {
      const storageProvider = oauthAccount.provider === "google" ? "google_drive" : "dropbox"
      
      // Check if StorageAccount exists
      const existingStorageAccount = user.storageAccounts.find(
        sa => sa.provider === storageProvider && sa.providerAccountId === oauthAccount.providerAccountId
      )

      if (!existingStorageAccount) {
        console.log(`   📝 Creating missing StorageAccount for ${storageProvider}`)
        
        if (!dryRun) {
          try {
            await prisma.storageAccount.create({
              data: {
                userId: user.id,
                provider: storageProvider,
                providerAccountId: oauthAccount.providerAccountId,
                displayName: user.name || user.email || "Unknown",
                email: user.email,
                status: StorageAccountStatus.ACTIVE,
                isActive: true,
                createdAt: oauthAccount.createdAt || new Date(),
                updatedAt: new Date()
              }
            })
            result.storageAccountsCreated++
            console.log(`   ✅ Created StorageAccount for ${storageProvider}`)
          } catch (error) {
            const errorMsg = `Failed to create StorageAccount for ${storageProvider}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            console.log(`   ❌ ${errorMsg}`)
          }
        } else {
          console.log(`   🔍 [DRY RUN] Would create StorageAccount for ${storageProvider}`)
          result.storageAccountsCreated++
        }
      }
    }

    // Fix 2: Validate and update existing StorageAccount statuses
    const storageAccountsToCheck = dryRun 
      ? user.storageAccounts 
      : await prisma.storageAccount.findMany({ where: { userId: user.id } })

    for (const storageAccount of storageAccountsToCheck) {
      const provider = storageAccount.provider === "google_drive" ? "google_drive" : "dropbox"
      
      console.log(`   🧪 Testing connection for ${storageAccount.provider}`)
      
      try {
        const validation = await validateStorageConnection(user.id, provider)
        
        if (validation.isValid && storageAccount.status !== StorageAccountStatus.ACTIVE) {
          console.log(`   🔄 Reactivating ${storageAccount.provider} account`)
          
          if (!dryRun) {
            await prisma.storageAccount.update({
              where: { id: storageAccount.id },
              data: {
                status: StorageAccountStatus.ACTIVE,
                lastError: null,
                lastAccessedAt: new Date(),
                updatedAt: new Date()
              }
            })
            result.storageAccountsReactivated++
            console.log(`   ✅ Reactivated ${storageAccount.provider} account`)
          } else {
            console.log(`   🔍 [DRY RUN] Would reactivate ${storageAccount.provider} account`)
            result.storageAccountsReactivated++
          }
        } else if (!validation.isValid && storageAccount.status === StorageAccountStatus.ACTIVE) {
          console.log(`   ⚠️  Disconnecting invalid ${storageAccount.provider} account`)
          
          if (!dryRun) {
            await prisma.storageAccount.update({
              where: { id: storageAccount.id },
              data: {
                status: StorageAccountStatus.DISCONNECTED,
                lastError: validation.error || "Connection validation failed",
                updatedAt: new Date()
              }
            })
            result.storageAccountsDisconnected++
            console.log(`   ❌ Disconnected ${storageAccount.provider} account: ${validation.error}`)
          } else {
            console.log(`   🔍 [DRY RUN] Would disconnect ${storageAccount.provider} account: ${validation.error}`)
            result.storageAccountsDisconnected++
          }
        } else {
          console.log(`   ✅ ${storageAccount.provider} account status is correct (${storageAccount.status})`)
        }
      } catch (error) {
        const errorMsg = `Failed to validate ${storageAccount.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.log(`   ❌ ${errorMsg}`)
      }
    }

  } catch (error) {
    const errorMsg = `Failed to process user ${userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`
    result.errors.push(errorMsg)
    console.log(`❌ ${errorMsg}`)
  }

  return result
}

async function fixAllUsers(dryRun: boolean = false): Promise<FixResult> {
  console.log("🔧 Fixing storage accounts for all affected users...")
  
  const result: FixResult = {
    usersProcessed: 0,
    storageAccountsCreated: 0,
    storageAccountsReactivated: 0,
    storageAccountsDisconnected: 0,
    errors: []
  }

  // Find users with OAuth accounts but no active storage accounts
  const problematicUsers = await prisma.user.findMany({
    where: {
      accounts: {
        some: {
          provider: { in: ["google", "dropbox"] }
        }
      }
    },
    include: {
      accounts: {
        where: { provider: { in: ["google", "dropbox"] } }
      },
      storageAccounts: true
    }
  })

  console.log(`Found ${problematicUsers.length} users with OAuth accounts`)

  for (const user of problematicUsers) {
    console.log(`\n👤 Processing: ${user.email}`)
    
    const userResult = await fixUserStorageAccounts(user.email, dryRun)
    
    // Aggregate results
    result.usersProcessed += userResult.usersProcessed
    result.storageAccountsCreated += userResult.storageAccountsCreated
    result.storageAccountsReactivated += userResult.storageAccountsReactivated
    result.storageAccountsDisconnected += userResult.storageAccountsDisconnected
    result.errors.push(...userResult.errors)
  }

  return result
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const userEmail = args.find(arg => !arg.startsWith("--"))

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made")
  }

  let result: FixResult

  if (userEmail) {
    result = await fixUserStorageAccounts(userEmail, dryRun)
  } else {
    result = await fixAllUsers(dryRun)
  }

  // Print summary
  console.log("\n📊 Fix Summary:")
  console.log(`   Users processed: ${result.usersProcessed}`)
  console.log(`   Storage accounts created: ${result.storageAccountsCreated}`)
  console.log(`   Storage accounts reactivated: ${result.storageAccountsReactivated}`)
  console.log(`   Storage accounts disconnected: ${result.storageAccountsDisconnected}`)
  
  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`)
    result.errors.forEach(error => console.log(`   • ${error}`))
  } else {
    console.log("\n✅ No errors encountered")
  }

  if (dryRun) {
    console.log("\n🔍 This was a dry run. Use without --dry-run to apply changes.")
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { fixUserStorageAccounts, fixAllUsers }