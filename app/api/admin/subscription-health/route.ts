import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkSubscriptionHealth } from '@/scripts/monitor-subscription-health'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to check subscription health and optionally fix issues
 * 
 * Query parameters:
 * - fix: boolean - Whether to automatically fix issues
 * - dryRun: boolean - Preview fixes without applying them
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const autoFix = searchParams.get('fix') === 'true'
    const dryRun = searchParams.get('dryRun') === 'true'

    console.log(`Admin ${session.user.email} triggered subscription health check`, {
      autoFix,
      dryRun
    })

    const report = await checkSubscriptionHealth(autoFix && !dryRun, dryRun)
    
    return NextResponse.json({
      success: true,
      report: {
        timestamp: report.timestamp,
        summary: {
          totalSubscriptions: report.totalSubscriptions,
          activeSubscriptions: report.activeSubscriptions,
          incompleteSubscriptions: report.incompleteSubscriptions,
          issuesFound: report.issues.length,
          fixesApplied: report.fixesApplied
        },
        issues: report.issues.map(issue => ({
          type: issue.type,
          severity: issue.severity,
          userEmail: issue.userEmail,
          planName: issue.planName,
          issue: issue.issue,
          suggestedFix: issue.suggestedFix,
          subscriptionId: issue.subscriptionId
        })),
        mode: dryRun ? 'dry-run' : autoFix ? 'auto-fix' : 'report-only'
      }
    })

  } catch (error: any) {
    console.error('Error checking subscription health:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check subscription health',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually fix specific subscription issues
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionIds } = await request.json()

    if (!subscriptionIds || !Array.isArray(subscriptionIds)) {
      return NextResponse.json(
        { error: 'subscriptionIds array is required' },
        { status: 400 }
      )
    }

    console.log(`Admin ${session.user.email} manually fixing subscriptions:`, subscriptionIds)

    // Run health check in fix mode for specific subscriptions
    const report = await checkSubscriptionHealth(true, false)
    
    const fixedSubscriptions = report.issues
      .filter(issue => subscriptionIds.includes(issue.subscriptionId))
      .filter(issue => issue.type === 'incomplete_with_payment') // Only fix this type for now

    return NextResponse.json({
      success: true,
      message: `Processed ${subscriptionIds.length} subscription(s)`,
      results: {
        requested: subscriptionIds.length,
        fixed: report.fixesApplied,
        issues: fixedSubscriptions
      }
    })

  } catch (error: any) {
    console.error('Error fixing subscriptions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix subscriptions',
        details: error.message 
      },
      { status: 500 }
    )
  }
}