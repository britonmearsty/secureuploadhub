/**
 * Grace Period Enforcement Script
 * Run this script periodically (e.g., daily via cron) to enforce grace periods
 */

import { enforceGracePeriods } from "@/lib/grace-period-enforcement"

async function main() {
  console.log('Starting grace period enforcement...')
  
  try {
    const result = await enforceGracePeriods({
      gracePeriodDays: 7,
      warningDays: [3, 1],
      enableAutoCancel: true
    })

    console.log('Grace period enforcement completed:', {
      processed: result.processed,
      cancelled: result.cancelled,
      warned: result.warned,
      errors: result.errors.length
    })

    if (result.errors.length > 0) {
      console.error('Errors during enforcement:')
      result.errors.forEach(error => console.error(`  - ${error}`))
      process.exit(1)
    }

  } catch (error) {
    console.error('Grace period enforcement failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}