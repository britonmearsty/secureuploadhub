#!/usr/bin/env tsx

/**
 * Background Sync Script
/**
 * 
 * This script automatically syncs storage accounts for all users with auto-sync enabled.
 * It removes files from the database that have been deleted from cloud storage.
 * 
 * Can be run as:
 * - Manual sync: npx tsx scripts/background-sync.ts
 * - Cron job: Run every 6 hours with: npx tsx scripts/background-sync.ts
 * - Via API: curl -X POST https://your-domain.com/api/storage/background-sync -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { config } from "dotenv"
config() // Load environment variables

const CRON_SECRET = process.env.CRON_SECRET || 'change-me-in-production'
const API_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL || new URL(process.env.NEXTAUTH_URL || '').hostname}`
  : 'http://localhost:3000'

async function main() {
  console.log('🔄 Starting background sync...')
  console.log(`   API URL: ${API_URL}`)
  console.log(`   Time: ${new Date().toISOString()}`)

  try {
    const response = await fetch(`${API_URL}/api/storage/background-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Background sync completed successfully')
      console.log(`   Users processed: ${result.stats.usersProcessed}`)
      console.log(`   Files synced: ${result.stats.filesSynced}`)
      console.log(`   Files deleted: ${result.stats.filesDeleted}`)
      
      if (result.stats.errors > 0) {
        console.log(`   Errors: ${result.stats.errors}`)
        if (result.errors && result.errors.length > 0) {
          console.log('   Error details:')
          result.errors.forEach((error: string) => {
            console.log(`     • ${error}`)
          })
        }
      }
    } else {
      console.error('❌ Background sync failed:', result.error)
      if (result.details) {
        console.error('   Details:', result.details)
      }
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Background sync failed:', error)
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

export { main as runBackgroundSync }