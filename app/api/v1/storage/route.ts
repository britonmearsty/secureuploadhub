/**
 * Consolidated Storage API
 * Replaces multiple scattered storage endpoints with a single resource-based API
 * 
 * Endpoints consolidated:
 * - GET /api/storage/accounts -> GET /api/v1/storage
 * - POST /api/storage/health-check -> POST /api/v1/storage/health-check
 * - POST /api/storage/disconnect -> POST /api/v1/storage/disconnect
 * - POST /api/storage/reconnect -> POST /api/v1/storage/reconnect
 */

import { NextRequest } from "next/server"
import { withAuthAndLogging, ApiResponse } from "@/lib/api/middleware"
import { getConnectedAccounts } from "@/lib/storage"
import { StorageAccountManager } from "@/lib/storage/storage-account-manager"
import { getActiveStorageAccountsForUser } from "@/lib/storage/data-integrity-helpers"

/**
 * GET /api/v1/storage - Get all storage accounts and their status
 */
export const GET = withAuthAndLogging('STORAGE_API')(
  async (request: NextRequest, session: any) => {
    // Enhanced fallback mechanism using the new StorageAccountManager
    const fallbackResult = await StorageAccountManager.ensureStorageAccountsForUser(
      session.user.id,
      { forceCreate: false, respectDisconnected: true }
    )
    
    if (fallbackResult.created > 0) {
      console.log(`✅ STORAGE_API: Created ${fallbackResult.created} missing StorageAccount(s) for user ${session.user.id}`)
    }
    
    if (fallbackResult.errors.length > 0) {
      console.warn(`⚠️ STORAGE_API: Fallback had errors:`, fallbackResult.errors)
    }

    // Get connected accounts (legacy format for backward compatibility)
    const accounts = await getConnectedAccounts(session.user.id)
    
    // Get clean storage accounts using new helper
    const activeStorageAccounts = await getActiveStorageAccountsForUser(session.user.id)

    return ApiResponse.success({
      accounts,
      activeStorageAccounts,
      fallbackInfo: {
        accountsCreated: fallbackResult.created,
        accountsReactivated: fallbackResult.reactivated,
        accountsValidated: fallbackResult.validated,
        errors: fallbackResult.errors
      }
    })
  }
)