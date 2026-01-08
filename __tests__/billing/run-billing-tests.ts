#!/usr/bin/env node

/**
 * Comprehensive Billing Test Runner
 * 
 * This script runs all billing-related tests and provides a summary report.
 * It can be used for CI/CD pipelines or manual testing.
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

interface TestSuite {
  name: string
  tests: TestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
}

class BillingTestRunner {
  private testSuites: TestSuite[] = []
  private startTime: number = 0

  constructor() {
    this.startTime = Date.now()
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Billing Tests...\n')

    const testFiles = [
      {
        name: 'Comprehensive Billing API Tests',
        path: '__tests__/billing/comprehensive-billing.test.ts',
      },
      {
        name: 'Billing Flow Integration Tests',
        path: '__tests__/integration/billing-flow.test.ts',
      },
      {
        name: 'Subscription Manager Unit Tests',
        path: '__tests__/lib/subscription-manager.test.ts',
      },
      {
        name: 'Existing Billing API Tests',
        path: '__tests__/api/billing.test.ts',
      },
    ]

    for (const testFile of testFiles) {
      await this.runTestSuite(testFile.name, testFile.path)
    }

    this.printSummary()
  }

  private async runTestSuite(name: string, filePath: string): Promise<void> {
    console.log(`📋 Running: ${name}`)
    
    if (!existsSync(filePath)) {
      console.log(`   ❌ Test file not found: ${filePath}\n`)
      return
    }

    const suiteStartTime = Date.now()
    
    try {
      const output = execSync(`npx vitest run ${filePath} --reporter=json`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      })

      const result = JSON.parse(output)
      const suite = this.parseTestResults(name, result, suiteStartTime)
      this.testSuites.push(suite)
      
      console.log(`   ✅ ${suite.passedTests}/${suite.totalTests} tests passed (${suite.duration}ms)`)
      
      if (suite.failedTests > 0) {
        console.log(`   ❌ ${suite.failedTests} tests failed`)
        suite.tests
          .filter(t => !t.passed)
          .forEach(t => console.log(`      - ${t.name}: ${t.error}`))
      }
      
    } catch (error) {
      console.log(`   ❌ Test suite failed to run: ${error}`)
      this.testSuites.push({
        name,
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        duration: Date.now() - suiteStartTime,
      })
    }
    
    console.log('')
  }

  private parseTestResults(suiteName: string, result: any, startTime: number): TestSuite {
    const tests: TestResult[] = []
    let totalTests = 0
    let passedTests = 0
    let failedTests = 0

    if (result.testResults) {
      for (const testFile of result.testResults) {
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            totalTests++
            const test: TestResult = {
              name: assertion.title,
              passed: assertion.status === 'passed',
              duration: assertion.duration || 0,
            }
            
            if (!test.passed) {
              failedTests++
              test.error = assertion.failureMessages?.[0] || 'Unknown error'
            } else {
              passedTests++
            }
            
            tests.push(test)
          }
        }
      }
    }

    return {
      name: suiteName,
      tests,
      totalTests,
      passedTests,
      failedTests,
      duration: Date.now() - startTime,
    }
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.totalTests, 0)
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passedTests, 0)
    const totalFailed = this.testSuites.reduce((sum, suite) => sum + suite.failedTests, 0)

    console.log('📊 Test Summary')
    console.log('================')
    console.log(`Total Test Suites: ${this.testSuites.length}`)
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${totalPassed}`)
    console.log(`Failed: ${totalFailed}`)
    console.log(`Duration: ${totalDuration}ms`)
    console.log('')

    if (totalFailed === 0) {
      console.log('🎉 All billing tests passed!')
    } else {
      console.log('❌ Some tests failed. Please review the output above.')
      
      console.log('\n📋 Failed Test Summary:')
      this.testSuites.forEach(suite => {
        if (suite.failedTests > 0) {
          console.log(`\n${suite.name}:`)
          suite.tests
            .filter(t => !t.passed)
            .forEach(t => console.log(`  - ${t.name}`))
        }
      })
    }

    console.log('\n🔧 Test Coverage Areas:')
    console.log('- Subscription creation and payment initialization')
    console.log('- Webhook processing (success, failure, renewals)')
    console.log('- Subscription status checking and recovery')
    console.log('- Payment linking and unlinked payment recovery')
    console.log('- Subscription cancellation (immediate and at period end)')
    console.log('- Error handling and edge cases')
    console.log('- Race condition prevention')
    console.log('- Data consistency and referential integrity')
    console.log('- Authentication and authorization')
    console.log('- Distributed locking and idempotency')

    process.exit(totalFailed > 0 ? 1 : 0)
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new BillingTestRunner()
  runner.runAllTests().catch(error => {
    console.error('Failed to run billing tests:', error)
    process.exit(1)
  })
}

export { BillingTestRunner }