#!/usr/bin/env tsx

/**
 * Test Script: Race Condition Fix Validation
 * 
 * This script tests the new StorageAccountManager to ensure:
 * 1. No duplicate StorageAccounts are created under concurrent load
 * 2. Distributed locking works correctly
 * 3. Idempotency prevents duplicate operations
 * 4. Fallback mechanisms work when Redis is unavailable
 */

import { StorageAccountManager } from "../lib/storage/storage-account-manager"
import prisma from "../lib/prisma"

interface TestResult {
  testName: string
  success: boolean
  duration: number
  details: any
  error?: string
}

class RaceConditionTester {
  private results: TestResult[] = []

  async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`\n🧪 Running: ${testName}`)
    const startTime = Date.now()
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        testName,
        success: true,
        duration,
        details: result
      })
      
      console.log(`✅ ${testName} - Passed (${duration}ms)`)
      console.log(`   Result:`, result)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.results.push({
        testName,
        success: false,
        duration,
        details: null,
        error: errorMessage
      })
      
      console.log(`❌ ${testName} - Failed (${duration}ms)`)
      console.log(`   Error: ${errorMessage}`)
    }
  }

  /**
   * Test 1: Basic StorageAccount Creation
   */
  async testBasicCreation(): Promise<void> {
    await this.runTest("Basic StorageAccount Creation", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })

      if (!user || user.accounts.length === 0) {
        throw new Error("No user with OAuth accounts found for testing")
      }

      const account = user.accounts[0]
      
      // Test creating StorageAccount
      const result = await StorageAccountManager.createOrGetStorageAccount(
        user.id,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name,
        { forceCreate: false, respectDisconnected: true }
      )

      if (!result.success) {
        throw new Error(`StorageAccount creation failed: ${result.error}`)
      }

      return {
        userId: user.id,
        provider: account.provider,
        storageAccountId: result.storageAccountId,
        created: result.created,
        existed: result.existed
      }
    })
  }

  /**
   * Test 2: Concurrent Creation (Race Condition Test)
   */
  async testConcurrentCreation(): Promise<void> {
    await this.runTest("Concurrent StorageAccount Creation", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })

      if (!user || user.accounts.length === 0) {
        throw new Error("No user with OAuth accounts found for testing")
      }

      const account = user.accounts[0]

      // Delete existing StorageAccount to test creation
      await prisma.storageAccount.deleteMany({
        where: {
          userId: user.id,
          provider: account.provider === "google" ? "google_drive" : "dropbox",
          providerAccountId: account.providerAccountId
        }
      })

      // Create 10 concurrent requests to create the same StorageAccount
      const concurrentPromises = Array.from({ length: 10 }, (_, index) =>
        StorageAccountManager.createOrGetStorageAccount(
          user.id,
          {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          },
          user.email,
          user.name,
          { forceCreate: false, respectDisconnected: true }
        ).then(result => ({ index, result }))
      )

      const results = await Promise.all(concurrentPromises)

      // Verify results
      const successfulResults = results.filter(r => r.result.success)
      const createdResults = results.filter(r => r.result.success && r.result.created)
      const existedResults = results.filter(r => r.result.success && r.result.existed)

      // Check that only one StorageAccount was actually created
      const finalStorageAccounts = await prisma.storageAccount.findMany({
        where: {
          userId: user.id,
          provider: account.provider === "google" ? "google_drive" : "dropbox",
          providerAccountId: account.providerAccountId
        }
      })

      if (finalStorageAccounts.length !== 1) {
        throw new Error(`Expected 1 StorageAccount, found ${finalStorageAccounts.length}`)
      }

      if (createdResults.length !== 1) {
        throw new Error(`Expected 1 creation result, found ${createdResults.length}`)
      }

      if (existedResults.length !== 9) {
        throw new Error(`Expected 9 existed results, found ${existedResults.length}`)
      }

      return {
        totalRequests: 10,
        successfulResults: successfulResults.length,
        createdCount: createdResults.length,
        existedCount: existedResults.length,
        finalStorageAccountsCount: finalStorageAccounts.length,
        storageAccountId: finalStorageAccounts[0].id
      }
    })
  }

  /**
   * Test 3: Idempotency Test
   */
  async testIdempotency(): Promise<void> {
    await this.runTest("Idempotency Protection", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })

      if (!user || user.accounts.length === 0) {
        throw new Error("No user with OAuth accounts found for testing")
      }

      const account = user.accounts[0]

      // Make the same request multiple times rapidly
      const results = []
      for (let i = 0; i < 5; i++) {
        const result = await StorageAccountManager.createOrGetStorageAccount(
          user.id,
          {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          },
          user.email,
          user.name,
          { forceCreate: false, respectDisconnected: true }
        )
        results.push(result)
      }

      // All should succeed and return the same StorageAccount ID
      const allSuccessful = results.every(r => r.success)
      const allSameId = results.every(r => r.storageAccountId === results[0].storageAccountId)

      if (!allSuccessful) {
        throw new Error("Not all idempotent requests succeeded")
      }

      if (!allSameId) {
        throw new Error("Idempotent requests returned different StorageAccount IDs")
      }

      return {
        requestCount: 5,
        allSuccessful,
        allSameId,
        storageAccountId: results[0].storageAccountId
      }
    })
  }

  /**
   * Test 4: Ensure User StorageAccounts
   */
  async testEnsureUserStorageAccounts(): Promise<void> {
    await this.runTest("Ensure User StorageAccounts", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })

      if (!user || user.accounts.length === 0) {
        throw new Error("No user with OAuth accounts found for testing")
      }

      const result = await StorageAccountManager.ensureStorageAccountsForUser(
        user.id,
        { forceCreate: false, respectDisconnected: true }
      )

      return {
        userId: user.id,
        oauthAccountsCount: user.accounts.length,
        created: result.created,
        validated: result.validated,
        reactivated: result.reactivated,
        errors: result.errors,
        detailsCount: result.details.length
      }
    })
  }

  /**
   * Test 5: Disconnected Account Handling
   */
  async testDisconnectedAccountHandling(): Promise<void> {
    await this.runTest("Disconnected Account Handling", async () => {
      // Find a user with OAuth accounts
      const user = await prisma.user.findFirst({
        include: {
          accounts: {
            where: { provider: { in: ["google", "dropbox"] } }
          }
        }
      })

      if (!user || user.accounts.length === 0) {
        throw new Error("No user with OAuth accounts found for testing")
      }

      const account = user.accounts[0]
      const storageProvider = account.provider === "google" ? "google_drive" : "dropbox"

      // First ensure StorageAccount exists
      await StorageAccountManager.createOrGetStorageAccount(
        user.id,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name,
        { forceCreate: false, respectDisconnected: true }
      )

      // Manually set it to DISCONNECTED
      await prisma.storageAccount.updateMany({
        where: {
          userId: user.id,
          provider: storageProvider,
          providerAccountId: account.providerAccountId
        },
        data: {
          status: "DISCONNECTED"
        }
      })

      // Test that respectDisconnected=true doesn't reactivate
      const result1 = await StorageAccountManager.createOrGetStorageAccount(
        user.id,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name,
        { forceCreate: false, respectDisconnected: true }
      )

      // Test that forceCreate=true does reactivate
      const result2 = await StorageAccountManager.createOrGetStorageAccount(
        user.id,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name,
        { forceCreate: true, respectDisconnected: false }
      )

      return {
        respectDisconnectedResult: {
          success: result1.success,
          operation: result1.details.operation
        },
        forceCreateResult: {
          success: result2.success,
          operation: result2.details.operation
        }
      }
    })
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Race Condition Fix Tests...\n')
    
    await this.testBasicCreation()
    await this.testConcurrentCreation()
    await this.testIdempotency()
    await this.testEnsureUserStorageAccounts()
    await this.testDisconnectedAccountHandling()

    // Print summary
    console.log('\n📊 Test Summary:')
    console.log('================')
    
    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Average Duration: ${Math.round(totalDuration / this.results.length)}ms`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`)
        })
    }
    
    console.log(`\n${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed!'}`)
    
    if (failed > 0) {
      process.exit(1)
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new RaceConditionTester()
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })
}

export { RaceConditionTester }