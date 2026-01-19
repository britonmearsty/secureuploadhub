#!/usr/bin/env tsx

/**
 * Subscription Email Scheduler
 * 
 * This script sends subscription-related emails:
 * - Expiration notifications
 * - Payment failure reminders
 * - Renewal confirmations
 * 
 * Run this script via cron job or scheduled task:
 * 
 * # Run daily at 9 AM
 * 0 9 * * * cd /path/to/project && npm run send-subscription-emails
 * 
 * Or manually:
 * npm run send-subscription-emails
 */

import { runSubscriptionEmailTasks } from '@/lib/subscription-emails'

async function main() {
  console.log('🚀 Starting subscription email scheduler...')
  console.log('📅 Time:', new Date().toISOString())

  try {
    const results = await runSubscriptionEmailTasks()
    
    const totalSent = results.expirationEmails.sent + 
                     results.expirationReminders.sent + 
                     results.paymentRetryNotifications.sent
    
    const totalFailed = results.expirationEmails.failed + 
                       results.expirationReminders.failed + 
                       results.paymentRetryNotifications.failed

    console.log('✅ Subscription email scheduler completed successfully')
    console.log(`📧 Total emails sent: ${totalSent}`)
    console.log(`❌ Total emails failed: ${totalFailed}`)
    
    if (totalFailed > 0) {
      console.warn('⚠️  Some emails failed to send. Check logs for details.')
      process.exit(1)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('💥 Subscription email scheduler failed:', error)
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