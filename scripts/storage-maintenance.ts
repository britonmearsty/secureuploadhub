#!/usr/bin/env tsx

/**
 * Storage Account Maintenance Script
 * 
 * This script performs regular maintenance on storage accounts:
 * - Creates missing StorageAccount records
 * - Reactivates disconnected accounts where OAuth still exists
 * - Disconnects orphaned accounts where OAuth was revoked
 * - Provides comprehensive reporting
 * 
 * Can be run as:
 * - Manual maintenance: npx tsx scripts/storage-maintenance.ts
 * - Cron job: 0 2 * * * npx tsx scripts/storage-maintenance.ts
 * - Specific user: npx tsx scripts/storage-maintenance.ts user@example.com
 */

import { config } from "dotenv"
config() // Load environment variables

import { performStorageAccountHealthCheck } from "../lib/storage/auto-create"
import { performBackgroundStorageAccountMaintenance } from "../lib/storage/middleware-fallback"

async function main() {
  const userEmail = process.argv[2]
  const isDryRun = process.argv.includes("--dry-run")
  
  console.log('🔧 STORAGE_MAINTENANCE: Starting maintenance...')
  console.log(`   Target: ${userEmail || 'All users'}`)
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Time: ${new Date().toISOString()}`)
  
  if (isDryRun) {
    console.log('⚠️ DRY RUN MODE: No changes will be made')
  }

  try {
    if (userEmail) {
      // Maintenance for specific user
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      try {
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true, email: true, name: true }
        })
        
        if (!user) {
          console.error(`❌ User not found: ${userEmail}`)
          process.exit(1)
        }
        
        console.log(`👤 Processing user: ${user.name} (${user.email})`)
        
        if (!isDryRun) {
          const result = await performStorageAccountHealthCheck(user.id)
          
          console.log('\n📊 Results:')
          console.log(`   Users checked: ${result.summary.usersChecked}`)
          console.log(`   Issues found: ${result.summary.issuesFound}`)
          console.log(`   Issues fixed: ${result.summary.issuesFixed}`)
          console.log(`   Critical errors: ${result.summary.criticalErrors}`)
          
          if (result.actions.length > 0) {
            console.log('\n🔧 Actions taken:')
            result.actions.forEach(action => {
              const icon = action.type === 'error' ? '❌' : '✅'
              console.log(`   ${icon} ${action.type.toUpperCase()}: ${action.provider} - ${action.details}`)
            })
          }
        } else {
          console.log('🔍 DRY RUN: Would perform health check for this user')
        }
      } finally {
        await prisma.$disconnect()
      }
    } else {
      // Maintenance for all users
      if (!isDryRun) {
        const result = await performBackgroundStorageAccountMaintenance()
        
        console.log('\n📊 Maintenance Results:')
        console.log(`   Users processed: ${result.usersProcessed}`)
        console.log(`   Issues fixed: ${result.issuesFixed}`)
        console.log(`   Errors: ${result.errors.length}`)
        
        if (result.errors.length > 0) {
          console.log('\n❌ Errors encountered:')
          result.errors.forEach(error => {
            console.log(`   • ${error}`)
          })
        }
        
        if (result.issuesFixed > 0) {
          console.log(`\n✅ Successfully fixed ${result.issuesFixed} storage account issues`)
        } else {
          console.log('\n✅ No issues found - all storage accounts are healthy')
        }
      } else {
        console.log('🔍 DRY RUN: Would perform maintenance for all users')
      }
    }
    
    console.log('\n🎉 Maintenance completed successfully')
    
  } catch (error) {
    console.error('\n❌ Maintenance failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { main as runStorageMaintenance }