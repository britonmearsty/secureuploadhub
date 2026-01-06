#!/usr/bin/env tsx

/**
 * Storage Account Fix Testing Script
 * 
 * This script tests all the storage account fix mechanisms:
 * - Tests automatic creation during OAuth
 * - Tests fallback mechanisms in API endpoints
 * - Tests health check functionality
 * - Tests edge cases and error scenarios
 * 
 * Run with: npx tsx scripts/test-storage-fixes.ts
 */

import { config } from "dotenv"
config() // Load environment variables

import prisma from "../lib/prisma"
import { 
  createStorageAccountForOAuth, 
  ensureStorageAccountsForUser, 
  performStorageAccountHealthCheck 
} from "../lib/storage/auto-create"
import { ensureUserStorageAccounts } from "../lib/storage/middleware-fallback"

interface TestResult {
  name: string
  passed: boolean
  details: string
  duration: number
}

class StorageFixTester {
  private results: TestResult[] = []
  
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      this.results.push({
        name,
        passed: true,
        details: "Test passed successfully",
        duration
      })
      console.log(`✅ ${name} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const details = error instanceof Error ? error.message : 'Unknown error'
      this.results.push({
        name,
        passed: false,
        details,
        duration
      })
      console.log(`❌ ${name} (${duration}ms): ${details}`)
    }
  }
  
  async testCreateStorageAccountForOAuth(): Promise<void> {
    await this.runTest("Create StorageAccount for OAuth", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })
      
      if (!user || user.accounts.length === 0) {
        throw new Error("No users with OAuth accounts found for testing")
      }
      
      const account = user.accounts[0]
      
      // Test creating StorageAccount
      const result = await createStorageAccountForOAuth(
        user.id,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name
      )
      
      // Result should be false if account already exists, true if created
      if (typeof result !== 'boolean') {
        throw new Error("Function should return boolean")
      }
    })
  }
  
  async testEnsureStorageAccountsForUser(): Promise<void> {
    await this.runTest("Ensure StorageAccounts for User", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })
      
      if (!user) {
        throw new Error("No users found for testing")
      }
      
      const result = await ensureStorageAccountsForUser(user.id)
      
      if (typeof result.created !== 'number' || !Array.isArray(result.errors)) {
        throw new Error("Function should return object with created count and errors array")
      }
      
      if (result.errors.length > 0) {
        console.warn(`  ⚠️ Errors during ensure: ${result.errors.join(', ')}`)
      }
    })
  }
  
  async testPerformHealthCheck(): Promise<void> {
    await this.runTest("Perform Health Check", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })
      
      if (!user) {
        throw new Error("No users found for testing")
      }
      
      const result = await performStorageAccountHealthCheck(user.id)
      
      if (!result.summary || !Array.isArray(result.actions)) {
        throw new Error("Function should return object with summary and actions")
      }
      
      if (result.summary.criticalErrors > 0) {
        console.warn(`  ⚠️ Critical errors found: ${result.summary.criticalErrors}`)
      }
    })
  }
  
  async testMiddlewareFallback(): Promise<void> {
    await this.runTest("Middleware Fallback", async () => {
      // This test requires a mock session, so we'll test the logic indirectly
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })
      
      if (!user) {
        throw new Error("No users found for testing")
      }
      
      // Test the core logic without session
      const result = await ensureStorageAccountsForUser(user.id)
      
      if (typeof result.created !== 'number') {
        throw new Error("Middleware fallback logic failed")
      }
    })
  }
  
  async testDatabaseConsistency(): Promise<void> {
    await this.runTest("Database Consistency Check", async () => {
      // Check for orphaned StorageAccounts
      const orphanedAccounts = await prisma.storageAccount.findMany({
        where: {
          user: {
            accounts: {
              none: {
                provider: { in: ["google", "dropbox"] }
              }
            }
          }
        },
        include: {
          user: {
            select: { email: true }
          }
        }
      })
      
      // Check for users with OAuth but no StorageAccounts
      const usersWithoutStorage = await prisma.user.findMany({
        where: {
          accounts: {
            some: {
              provider: { in: ["google", "dropbox"] }
            }
          },
          storageAccounts: {
            none: {}
          }
        },
        select: { email: true }
      })
      
      if (orphanedAccounts.length > 0) {
        console.warn(`  ⚠️ Found ${orphanedAccounts.length} orphaned StorageAccounts`)
      }
      
      if (usersWithoutStorage.length > 0) {
        console.warn(`  ⚠️ Found ${usersWithoutStorage.length} users with OAuth but no StorageAccounts`)
      }
    })
  }
  
  async testErrorHandling(): Promise<void> {
    await this.runTest("Error Handling", async () => {
      // Test with invalid user ID
      const result = await ensureStorageAccountsForUser("invalid-user-id")
      
      if (result.errors.length === 0) {
        throw new Error("Should have returned error for invalid user ID")
      }
      
      // Test with invalid provider
      const createResult = await createStorageAccountForOAuth(
        "invalid-user-id",
        { provider: "invalid-provider", providerAccountId: "test" },
        null,
        null
      )
      
      if (createResult !== false) {
        throw new Error("Should return false for invalid provider")
      }
    })
  }
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Storage Account Fix Tests...\n')
    
    await this.testCreateStorageAccountForOAuth()
    await this.testEnsureStorageAccountsForUser()
    await this.testPerformHealthCheck()
    await this.testMiddlewareFallback()
    await this.testDatabaseConsistency()
    await this.testErrorHandling()
    
    console.log('\n📊 Test Results Summary:')
    console.log(`   Total tests: ${this.results.length}`)
    console.log(`   Passed: ${this.results.filter(r => r.passed).length}`)
    console.log(`   Failed: ${this.results.filter(r => !r.passed).length}`)
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    console.log(`   Total duration: ${totalDuration}ms`)
    
    if (this.results.some(r => !r.passed)) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.name}: ${result.details}`)
      })
      process.exit(1)
    } else {
      console.log('\n✅ All tests passed!')
    }
  }
}

async function main() {
  const tester = new StorageFixTester()
  await tester.runAllTests()
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('Test suite failed:', error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}

export { StorageFixTester }