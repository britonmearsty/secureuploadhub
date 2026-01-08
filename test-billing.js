#!/usr/bin/env node

/**
 * Simple Billing Test Runner
 * 
 * Usage: node test-billing.js [test-type]
 * 
 * test-type options:
 *   all       - Run all billing tests (default)
 *   unit      - Run unit tests only
 *   integration - Run integration tests only
 *   api       - Run API tests only
 */

const { execSync } = require('child_process')
const { existsSync } = require('fs')

const testType = process.argv[2] || 'all'

const testConfigs = {
  all: {
    name: 'All Billing Tests',
    patterns: [
      '__tests__/billing/**/*.test.ts',
      '__tests__/integration/billing-flow.test.ts',
      '__tests__/lib/subscription-manager.test.ts',
      '__tests__/api/billing.test.ts'
    ]
  },
  unit: {
    name: 'Unit Tests',
    patterns: [
      '__tests__/lib/subscription-manager.test.ts'
    ]
  },
  integration: {
    name: 'Integration Tests',
    patterns: [
      '__tests__/integration/billing-flow.test.ts'
    ]
  },
  api: {
    name: 'API Tests',
    patterns: [
      '__tests__/billing/comprehensive-billing.test.ts',
      '__tests__/api/billing.test.ts'
    ]
  }
}

function runTests(config) {
  console.log(`🧪 Running ${config.name}...\n`)
  
  const existingPatterns = config.patterns.filter(pattern => {
    // Simple check - just verify the directory exists for glob patterns
    const dir = pattern.split('**')[0] || pattern.split('*')[0]
    return existsSync(dir)
  })
  
  if (existingPatterns.length === 0) {
    console.log('❌ No test files found for the specified pattern')
    return false
  }
  
  try {
    const command = `npx vitest run ${existingPatterns.join(' ')} --reporter=verbose`
    console.log(`Running: ${command}\n`)
    
    execSync(command, {
      stdio: 'inherit',
      encoding: 'utf-8'
    })
    
    console.log('\n✅ All tests completed successfully!')
    return true
    
  } catch (error) {
    console.log('\n❌ Some tests failed')
    console.log('Exit code:', error.status)
    return false
  }
}

function printUsage() {
  console.log('Billing Test Runner')
  console.log('==================')
  console.log('')
  console.log('Usage: node test-billing.js [test-type]')
  console.log('')
  console.log('Available test types:')
  Object.entries(testConfigs).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.name}`)
  })
  console.log('')
  console.log('Examples:')
  console.log('  node test-billing.js          # Run all tests')
  console.log('  node test-billing.js unit     # Run unit tests only')
  console.log('  node test-billing.js api      # Run API tests only')
}

function main() {
  if (testType === 'help' || testType === '--help' || testType === '-h') {
    printUsage()
    return
  }
  
  const config = testConfigs[testType]
  if (!config) {
    console.log(`❌ Unknown test type: ${testType}`)
    console.log('')
    printUsage()
    process.exit(1)
  }
  
  const success = runTests(config)
  
  if (!success) {
    console.log('\n🔧 Troubleshooting Tips:')
    console.log('- Make sure all dependencies are installed: npm install')
    console.log('- Check that test files exist in the expected locations')
    console.log('- Verify that vitest is properly configured')
    console.log('- Check for syntax errors in test files')
    
    process.exit(1)
  }
}

main()