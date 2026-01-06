import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { performStorageAccountHealthCheck } from "@/lib/storage/auto-create"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use the comprehensive health check function
    const healthCheckResult = await performStorageAccountHealthCheck(session.user.id)

    // Format the response for the frontend
    const results = healthCheckResult.actions.map(action => ({
      accountId: action.type === 'created' ? 'new' : 'existing',
      provider: action.provider,
      action: action.type,
      previousStatus: action.type === 'reactivated' ? 'DISCONNECTED' : null,
      newStatus: action.type === 'created' || action.type === 'reactivated' ? 'ACTIVE' : null,
      error: action.type === 'error' ? action.details : null
    }))

    return NextResponse.json({
      success: true,
      checkedAccounts: healthCheckResult.summary.usersChecked,
      createdAccounts: healthCheckResult.actions.filter(a => a.type === 'created').length,
      reactivatedAccounts: healthCheckResult.actions.filter(a => a.type === 'reactivated').length,
      results,
      summary: healthCheckResult.summary
    })

  } catch (error) {
    console.error("Storage health check failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}