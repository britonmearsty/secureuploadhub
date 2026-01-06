#!/usr/bin/env tsx

/**
 * Diagnostic Script: Storage Account Issue Analysis
 * 
 * This script helps diagnose why users get "No active google_drive storage account available"
 * Run with: npx tsx scripts/diagnose-storage-issue.ts [user-email]
 */

import { config } from "dotenv"
config() // Load environment variables

import prisma from "../lib/prisma"
import { StorageAccountStatus } from "@prisma/client"
import { validateStorageConnection } from "../lib/storage"

async function diagnoseUser(userEmail: string) {
  console.log(`🔍 Diagnosing storage issues for: ${userEmail}`)
  
  // Find user
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
    console.log("❌ User not found")
    return
  }

  console.log(`\n👤 User: ${user.name} (${user.email})`)
  console.log(`   ID: ${user.id}`)

  // Check OAuth accounts
  console.log(`\n🔐 OAuth Accounts (${user.accounts.length}):`)
  for (const account of user.accounts) {
    console.log(`   • ${account.provider}: ${account.providerAccountId}`)
    console.log(`     Token: ${account.access_token ? 'Present' : 'Missing'}`)
    console.log(`     Expires: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'Never'}`)
    console.log(`     Refresh: ${account.refresh_token ? 'Present' : 'Missing'}`)
  }

  // Check storage accounts
  console.log(`\n💾 Storage Accounts (${user.storageAccounts.length}):`)
  for (const storageAccount of user.storageAccounts) {
    console.log(`   • ${storageAccount.provider}: ${storageAccount.displayName}`)
    console.log(`     Status: ${storageAccount.status}`)
    console.log(`     Email: ${storageAccount.email}`)
    console.log(`     Provider Account ID: ${storageAccount.providerAccountId}`)
    console.log(`     Last Error: ${storageAccount.lastError || 'None'}`)
    console.log(`     Created: ${storageAccount.createdAt.toISOString()}`)
    console.log(`     Updated: ${storageAccount.updatedAt.toISOString()}`)
  }

  // Test connections
  console.log(`\n🧪 Connection Tests:`)
  for (const account of user.accounts) {
    const provider = account.provider === "google" ? "google_drive" : "dropbox"
    console.log(`   Testing ${provider}...`)
    
    try {
      const validation = await validateStorageConnection(user.id, provider)
      console.log(`     Result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`)
      if (!validation.isValid) {
        console.log(`     Error: ${validation.error}`)
      }
    } catch (error) {
      console.log(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Check portal creation eligibility
  console.log(`\n🚪 Portal Creation Eligibility:`)
  const googleAccounts = user.storageAccounts.filter(acc => acc.provider === "google_drive")
  const dropboxAccounts = user.storageAccounts.filter(acc => acc.provider === "dropbox")
  
  console.log(`   Google Drive:`)
  if (googleAccounts.length === 0) {
    console.log(`     ❌ No Google Drive storage accounts`)
  } else {
    const activeGoogle = googleAccounts.filter(acc => acc.status === StorageAccountStatus.ACTIVE)
    console.log(`     Total: ${googleAccounts.length}, Active: ${activeGoogle.length}`)
    if (activeGoogle.length === 0) {
      console.log(`     ❌ No ACTIVE Google Drive accounts`)
      googleAccounts.forEach(acc => {
        console.log(`       - ${acc.displayName}: ${acc.status}`)
      })
    } else {
      console.log(`     ✅ Can create Google Drive portals`)
    }
  }

  console.log(`   Dropbox:`)
  if (dropboxAccounts.length === 0) {
    console.log(`     ❌ No Dropbox storage accounts`)
  } else {
    const activeDropbox = dropboxAccounts.filter(acc => acc.status === StorageAccountStatus.ACTIVE)
    console.log(`     Total: ${dropboxAccounts.length}, Active: ${activeDropbox.length}`)
    if (activeDropbox.length === 0) {
      console.log(`     ❌ No ACTIVE Dropbox accounts`)
      dropboxAccounts.forEach(acc => {
        console.log(`       - ${acc.displayName}: ${acc.status}`)
      })
    } else {
      console.log(`     ✅ Can create Dropbox portals`)
    }
  }
}

async function diagnoseAll() {
  console.log("🔍 Diagnosing all users with OAuth accounts but no active storage accounts...")
  
  const problematicUsers = await prisma.user.findMany({
    where: {
      accounts: {
        some: {
          provider: { in: ["google", "dropbox"] }
        }
      },
      storageAccounts: {
        none: {
          status: StorageAccountStatus.ACTIVE
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

  console.log(`Found ${problematicUsers.length} users with OAuth but no active storage accounts`)
  
  for (const user of problematicUsers) {
    console.log(`\n👤 ${user.email}:`)
    console.log(`   OAuth accounts: ${user.accounts.length}`)
    console.log(`   Storage accounts: ${user.storageAccounts.length}`)
    
    if (user.storageAccounts.length === 0) {
      console.log(`   Issue: Missing StorageAccount records`)
    } else {
      console.log(`   Issue: All storage accounts are non-ACTIVE`)
      user.storageAccounts.forEach(acc => {
        console.log(`     - ${acc.provider}: ${acc.status}`)
      })
    }
  }
}

async function main() {
  const userEmail = process.argv[2]
  
  if (userEmail) {
    await diagnoseUser(userEmail)
  } else {
    await diagnoseAll()
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { diagnoseUser, diagnoseAll }