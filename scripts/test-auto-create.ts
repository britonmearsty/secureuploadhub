#!/usr/bin/env tsx

/**
 * Test Script: Automatic StorageAccount Creation
 * 
 * This script tests the automatic StorageAccount creation functionality
 * Run with: npx tsx scripts/test-auto-create.ts [user-email]
 */

import { config } from "dotenv"
config() // Load environment variables

import prisma from "../lib/prisma"
import { ensureStorageAccountsForUser, ensureStorageAccountsForAllUsers } from "../lib/storage/auto-create"

async function testUserAutoCreate(userEmail: string) {
  console.log(`🧪 Testing automatic StorageAccount creation for: ${userEmail}`)
  
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
  console.log(`   OAuth accounts: ${user.accounts.length}`)
  console.log(`   StorageAccounts before: ${user.storageAccounts.length}`)

  // Test the auto-create function
  const result = await ensureStorageAccountsForUser(user.id)
  
  console.log(`\n📊 Auto-create results:`)
  console.log(`   Created: ${result.created}`)
  console.log(`   Errors: ${result.errors.length}`)
  
  if (result.errors.length > 0) {
    console.log(`   Error details:`)
    result.errors.forEach(error => console.log(`     - ${error}`))
  }

  // Check final state
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      storageAccounts: true
    }
  })

  console.log(`   StorageAccounts after: ${updatedUser?.storageAccounts.length || 0}`)
  
  if (updatedUser?.storageAccounts) {
    updatedUser.storageAccounts.forEach(sa => {
      console.log(`     - ${sa.provider}: ${sa.status} (${sa.displayName})`)
    })
  }
}

async function testAllUsersAutoCreate() {
  console.log("🧪 Testing automatic StorageAccount creation for all users...")
  
  const result = await ensureStorageAccountsForAllUsers()
  
  console.log(`\n📊 Batch auto-create results:`)
  console.log(`   Users processed: ${result.usersProcessed}`)
  console.log(`   Accounts created: ${result.accountsCreated}`)
  console.log(`   Errors: ${result.errors.length}`)
  
  if (result.errors.length > 0) {
    console.log(`   Error details:`)
    result.errors.forEach(error => console.log(`     - ${error}`))
  }
}

async function main() {
  const userEmail = process.argv[2]
  
  if (userEmail) {
    await testUserAutoCreate(userEmail)
  } else {
    await testAllUsersAutoCreate()
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { testUserAutoCreate, testAllUsersAutoCreate }