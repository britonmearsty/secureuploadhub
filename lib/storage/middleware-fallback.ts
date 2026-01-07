/**
 * Storage Account Middleware Fallback
 * 
 * This module provides middleware-level fallback mechanisms to ensure
 * StorageAccount records exist before critical operations.
 * 
 * Used as a safety net in API routes that depend on storage accounts.
 */

import { auth } from "@/auth"
import { StorageAccountManager } from "./storage-account-manager"

/**
 * Middleware function to ensure StorageAccounts exist for the current user
 * Call this at the beginning of API routes that require storage accounts
 */
export async function ensureUserStorageAccounts(): Promise<{
  userId: string | null
  ensured: boolean
  created: number
  errors: string[]
}> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return {
      userId: null,
      ensured: false,
      created: 0,
      errors: ["No authenticated user"]
    }
  }

  try {
    const result = await StorageAccountManager.ensureStorageAccountsForUser(session.user.id, {
      forceCreate: false,
      respectDisconnected: true
    })
    
    if (result.created > 0) {
      console.log(`🛡️ MIDDLEWARE_FALLBACK: Created ${result.created} missing StorageAccount(s) for user ${session.user.id}`)
    }
    
    return {
      userId: session.user.id,
      ensured: true,
      created: result.created,
      errors: result.errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ MIDDLEWARE_FALLBACK: Failed to ensure StorageAccounts for user ${session.user.id}:`, errorMessage)
    
    return {
      userId: session.user.id,
      ensured: false,
      created: 0,
      errors: [errorMessage]
    }
  }
}

/**
 * Higher-order function that wraps API route handlers with storage account fallback
 */
export function withStorageAccountFallback<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    // Ensure storage accounts exist before executing the handler
    const fallbackResult = await ensureUserStorageAccounts()
    
    if (fallbackResult.created > 0) {
      console.log(`🛡️ WRAPPER: Auto-created ${fallbackResult.created} StorageAccount(s) before API execution`)
    }
    
    if (fallbackResult.errors.length > 0) {
      console.warn(`⚠️ WRAPPER: StorageAccount fallback had errors:`, fallbackResult.errors)
    }
    
    // Execute the original handler
    return handler(...args)
  }
}

/**
 * Specific fallback for portal-related operations
 */
export async function ensureStorageForPortalOperation(
  userId: string,
  requiredProvider?: string
): Promise<{
  success: boolean
  created: number
  hasRequiredProvider: boolean
  errors: string[]
}> {
  console.log(`🔍 ensureStorageForPortalOperation: Starting for userId=${userId}, requiredProvider=${requiredProvider}`)
  
  try {
    const result = await StorageAccountManager.ensureStorageAccountsForUser(userId, {
      forceCreate: false,
      respectDisconnected: true
    })
    console.log(`🔍 ensureStorageForPortalOperation: ensureStorageAccountsForUser result:`, result)
    
    let hasRequiredProvider = true
    
    if (requiredProvider) {
      // Use the existing prisma instance instead of creating a new one
      const prisma = (await import('@/lib/prisma')).default
      
      console.log(`🔍 ensureStorageForPortalOperation: Checking for provider=${requiredProvider}`)
      
      const storageAccount = await prisma.storageAccount.findFirst({
        where: {
          userId,
          provider: requiredProvider,
          status: "ACTIVE"
        }
      })
      
      console.log(`🔍 ensureStorageForPortalOperation: Found storage account:`, !!storageAccount)
      if (storageAccount) {
        console.log(`🔍 ensureStorageForPortalOperation: Storage account details:`, {
          id: storageAccount.id,
          provider: storageAccount.provider,
          status: storageAccount.status
        })
      }
      
      hasRequiredProvider = !!storageAccount
    }
    
    console.log(`🔍 ensureStorageForPortalOperation: Final result:`, {
      success: true,
      created: result.created,
      hasRequiredProvider,
      errors: result.errors
    })
    
    return {
      success: true,
      created: result.created,
      hasRequiredProvider,
      errors: result.errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ ensureStorageForPortalOperation: Error:`, errorMessage)
    return {
      success: false,
      created: 0,
      hasRequiredProvider: false,
      errors: [errorMessage]
    }
  }
}

/**
 * Background task to periodically check and fix storage account issues
 * This can be called from a cron job or scheduled task
 */
export async function performBackgroundStorageAccountMaintenance(): Promise<{
  usersProcessed: number
  issuesFixed: number
  errors: string[]
}> {
  console.log('🔧 BACKGROUND_MAINTENANCE: Starting storage account maintenance...')
  
  try {
    const result = await StorageAccountManager.ensureStorageAccountsForUser("all-users", {
      forceCreate: false,
      respectDisconnected: true
    })
    
    console.log(`✅ BACKGROUND_MAINTENANCE: Completed - processed users, created ${result.created} accounts, reactivated ${result.reactivated} accounts`)
    
    return {
      usersProcessed: 1, // This would need to be updated for batch processing
      issuesFixed: result.created + result.reactivated,
      errors: result.errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ BACKGROUND_MAINTENANCE: Failed:', errorMessage)
    
    return {
      usersProcessed: 0,
      issuesFixed: 0,
      errors: [errorMessage]
    }
  }
}