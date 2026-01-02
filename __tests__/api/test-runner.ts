#!/usr/bin/env node

/**
 * API Test Runner
 * 
 * This script provides utilities for running API tests with different configurations
 * and generating comprehensive test reports.
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  file: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
}

interface TestSuite {
  name: string
  files: string[]
  description: string
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'authentication',
    files: ['auth.test.ts'],
    description: 'Authentication and authorization tests'
  },
  {
    name: 'core-functionality',
    files: ['portals.test.ts', 'upload.test.ts', 'uploads.test.ts'],
    description: 'Core portal and upload functionality'
  },
  {
    name: 'user-features',
    files: ['dashboard.test.ts', 'storage.test.ts'],
    description: 'User dashboard and storage management'
  },
  {
    name: 'billing',
    files: ['billing.test.ts'],
    description: 'Billing and subscription management'
  },
  {
    name: 'admin',
    files: ['admin.test.ts'],
    description: 'Administrative operations'
  },
  {
    name: 'public-api',
    files: ['public.test.ts', 'newsletter.test.ts'],
    description: 'Public API endpoints'
  }
]

class APITestRunner {
  private testDir = '__tests__/api'
  private reportDir = 'test-reports'

  constructor() {
    this.ensureReportDir()
  }

  private ensureReportDir() {
    if (!existsSync(this.reportDir)) {
      execSync(`mkdir -p ${this.reportDir}`)
    }
  }

  /**
   * Run all API tests
   */
  async runAll(options: { coverage?: boolean; watch?: boolean } = {}) {
    console.log('🚀 Running all API tests...\n')
    
    const command = this.buildCommand('**/*.test.ts', options)
    
    try {
      execSync(command, { stdio: 'inherit' })
      console.log('\n✅ All tests completed successfully!')
    } catch (error) {
      console.error('\n❌ Some tests failed')
      process.exit(1)
    }
  }

  /**
   * Run tests for a specific suite
   */
  async runSuite(suiteName: string, options: { coverage?: boolean; watch?: boolean } = {}) {
    const suite = TEST_SUITES.find(s => s.name === suiteName)
    if (!suite) {
      console.error(`❌ Test suite '${suiteName}' not found`)
      console.log('Available suites:', TEST_SUITES.map(s => s.name).join(', '))
      process.exit(1)
    }

    console.log(`🚀 Running ${suite.name} test suite...`)
    console.log(`📝 ${suite.description}\n`)

    const filePattern = suite.files.length === 1 
      ? suite.files[0] 
      : `{${suite.files.join(',')}}`
    
    const command = this.buildCommand(filePattern, options)
    
    try {
      execSync(command, { stdio: 'inherit' })
      console.log(`\n✅ ${suite.name} tests completed successfully!`)
    } catch (error) {
      console.error(`\n❌ ${suite.name} tests failed`)
      process.exit(1)
    }
  }

  /**
   * Run a specific test file
   */
  async runFile(fileName: string, options: { coverage?: boolean; watch?: boolean } = {}) {
    const fullPath = join(this.testDir, fileName)
    
    if (!existsSync(fullPath)) {
      console.error(`❌ Test file '${fileName}' not found in ${this.testDir}`)
      process.exit(1)
    }

    console.log(`🚀 Running ${fileName}...\n`)
    
    const command = this.buildCommand(fileName, options)
    
    try {
      execSync(command, { stdio: 'inherit' })
      console.log(`\n✅ ${fileName} completed successfully!`)
    } catch (error) {
      console.error(`\n❌ ${fileName} failed`)
      process.exit(1)
    }
  }

  /**
   * Generate test report
   */
  async generateReport() {
    console.log('📊 Generating comprehensive test report...\n')
    
    const command = `npx vitest ${this.testDir} --run --reporter=json --outputFile=${this.reportDir}/results.json`
    
    try {
      execSync(command, { stdio: 'pipe' })
      
      // Generate HTML report
      const htmlReport = this.generateHTMLReport()
      writeFileSync(join(this.reportDir, 'report.html'), htmlReport)
      
      console.log(`✅ Test report generated in ${this.reportDir}/`)
      console.log(`📄 View HTML report: ${this.reportDir}/report.html`)
    } catch (error) {
      console.error('❌ Failed to generate test report')
      process.exit(1)
    }
  }

  /**
   * List available test suites and files
   */
  listTests() {
    console.log('📋 Available API Test Suites:\n')
    
    TEST_SUITES.forEach(suite => {
      console.log(`🔹 ${suite.name}`)
      console.log(`   ${suite.description}`)
      console.log(`   Files: ${suite.files.join(', ')}`)
      console.log()
    })

    console.log('📁 Individual Test Files:')
    const allFiles = TEST_SUITES.flatMap(s => s.files)
    allFiles.forEach(file => {
      console.log(`   • ${file}`)
    })
  }

  private buildCommand(pattern: string, options: { coverage?: boolean; watch?: boolean }) {
    let command = `npx vitest ${this.testDir}/${pattern}`
    
    if (!options.watch) {
      command += ' --run'
    }
    
    if (options.coverage) {
      command += ' --coverage'
    }
    
    return command
  }

  private generateHTMLReport(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .suite { background: #f8f9fa; border-left: 4px solid #007acc; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .suite-name { font-weight: bold; color: #007acc; font-size: 1.1em; }
        .suite-desc { color: #666; margin: 5px 0; }
        .files { margin-top: 10px; }
        .file { background: white; padding: 8px 12px; margin: 5px 0; border-radius: 4px; border: 1px solid #e1e5e9; }
        .commands { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .commands h3 { color: #90cdf4; margin-top: 0; }
        .command { background: #4a5568; padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-family: 'Monaco', 'Consolas', monospace; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e5e9; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 API Test Report</h1>
        <p>Comprehensive test coverage for all API routes in the application.</p>
        
        <h2>📊 Test Suites</h2>
        ${TEST_SUITES.map(suite => `
        <div class="suite">
            <div class="suite-name">${suite.name}</div>
            <div class="suite-desc">${suite.description}</div>
            <div class="files">
                ${suite.files.map(file => `<div class="file">📄 ${file}</div>`).join('')}
            </div>
        </div>
        `).join('')}
        
        <div class="commands">
            <h3>🚀 Quick Commands</h3>
            <div class="command">npm run test:api</div>
            <div class="command">npm run test:api:watch</div>
            <div class="command">npm run test:api:coverage</div>
            <div class="command">npx tsx __tests__/api/test-runner.ts --suite core-functionality</div>
        </div>
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Total Test Files: ${TEST_SUITES.reduce((acc, suite) => acc + suite.files.length, 0)}</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const runner = new APITestRunner()

  if (args.length === 0) {
    runner.listTests()
    return
  }

  const command = args[0]
  const options = {
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch')
  }

  switch (command) {
    case '--all':
      await runner.runAll(options)
      break
    
    case '--suite':
      const suiteName = args[1]
      if (!suiteName) {
        console.error('❌ Please specify a suite name')
        process.exit(1)
      }
      await runner.runSuite(suiteName, options)
      break
    
    case '--file':
      const fileName = args[1]
      if (!fileName) {
        console.error('❌ Please specify a file name')
        process.exit(1)
      }
      await runner.runFile(fileName, options)
      break
    
    case '--report':
      await runner.generateReport()
      break
    
    case '--list':
      runner.listTests()
      break
    
    default:
      console.log(`
🧪 API Test Runner

Usage:
  npx tsx __tests__/api/test-runner.ts [command] [options]

Commands:
  --all                    Run all API tests
  --suite <name>          Run specific test suite
  --file <name>           Run specific test file
  --report                Generate test report
  --list                  List available tests

Options:
  --coverage              Include coverage report
  --watch                 Run in watch mode

Examples:
  npx tsx __tests__/api/test-runner.ts --all --coverage
  npx tsx __tests__/api/test-runner.ts --suite core-functionality
  npx tsx __tests__/api/test-runner.ts --file portals.test.ts --watch
      `)
      break
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { APITestRunner }