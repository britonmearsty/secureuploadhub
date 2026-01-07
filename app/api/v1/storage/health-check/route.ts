/**
 * Storage Health Check API
 * Consolidated endpoint for storage account health checks
 */

import { NextRequest } from "next/server"
import { withAuthValidationAndLogging, ApiResponse } from "@/lib/api/middleware"
import { schemas } from "@/lib/api/schemas"
import { performStorageAccountHealthCheck } from "@/lib/storage/auto-create"

/**
 * POST /api/v1/storage/health-check - Perform storage account health check
 */
export const POST = withAuthValidationAndLogging('STORAGE_HEALTH_CHECK', schemas.storage.healthCheck)(
  async (request: NextRequest, session: any, data: any) => {
    // Note: The health check function currently only supports userId parameter
    // Provider-specific and forceCheck options are not yet implemented
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

    return ApiResponse.success({
      success: true,
      checkedAccounts: healthCheckResult.summary.usersChecked,
      createdAccounts: healthCheckResult.actions.filter(a => a.type === 'created').length,
      reactivatedAccounts: healthCheckResult.actions.filter(a => a.type === 'reactivated').length,
      results,
      summary: healthCheckResult.summary
    })
  }
)