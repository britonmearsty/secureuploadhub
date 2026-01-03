/**
 * Subscription Renewal Cron Job Script
 * 
 * This script should be run daily (e.g., via cron or scheduled task)
 * to process subscription renewals and handle expired grace periods.
 * 
 * Usage:
 *   - Via cron: Add to crontab: 0 2 * * * curl -X POST https://your-domain.com/api/billing/renewal -H "Authorization: Bearer YOUR_CRON_SECRET"
 *   - Via Vercel Cron: Add to vercel.json
 *   - Via external cron service: Configure to call the API endpoint
 */

import { config } from 'dotenv'

// Load environment variables
config()

const CRON_SECRET = process.env.CRON_SECRET || 'change-me-in-production'
const API_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL || new URL(process.env.NEXTAUTH_URL || '').hostname}`
  : 'http://localhost:3000'

async function runRenewal() {
  try {
    console.log(`[${new Date().toISOString()}] Starting subscription renewal process...`)
    
    const response = await fetch(`${API_URL}/api/billing/renewal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Renewal API returned ${response.status}: ${error}`)
    }

    const result = await response.json()
    console.log(`[${new Date().toISOString()}] Renewal process completed:`, result)
    
    return result
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error running renewal:`, error.message)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  runRenewal()
    .then(() => {
      console.log('Renewal script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Renewal script failed:', error)
      process.exit(1)
    })
}

export { runRenewal }

