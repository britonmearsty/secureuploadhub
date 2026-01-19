#!/usr/bin/env tsx

/**
 * Batch Upload Session Cleanup
 * 
 * This script cleans up expired batch upload sessions from Redis.
 * Should be run periodically via cron job.
 * 
 * Usage:
 * npm run cleanup-batch-sessions
 * 
 * Or via cron (every hour):
 * 0 * * * * cd /path/to/project && npm run cleanup-batch-sessions
 */

import { cleanupExpiredBatchSessions } from '@/lib/upload-batch-tracker'

async function main() {
  console.log('🧹 Starting batch session cleanup...')
  console.log('📅 Time:', new Date().toISOString())

  try {
    const cleanedCount = await cleanupExpiredBatchSessions()
    
    console.log('✅ Batch session cleanup completed successfully')
    console.log(`🗑️ Cleaned up ${cleanedCount} expired sessions`)
    
    process.exit(0)
  } catch (error) {
    console.error('💥 Batch session cleanup failed:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

main()