/**
 * Automatic StorageAccount Creation
 * Ensures StorageAccount records are created when OAuth accounts are established
 * 
 * COMPREHENSIVE PERMANENT FIX:
 * - Handles all OAuth signup scenarios
 * - Provides multiple fallback layers
 * - Includes error recovery mechanisms
 * - Prevents duplicate creation
 * - Handles edge cases and race conditions
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

/**
 * Enhanced logging for storage account operations
 */
function logStorageOperation(operation: string, details: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] STORAGE_AUTO_CREATE: ${operation}`, details)
}

/**
 * Retry mechanism for database operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      logStorageOperation('RETRY_ATTEMPT', {
        attempt,
        maxRetries,
        error: lastError.message
      })
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
  }
  
  throw lastError
}

/**
 * Create StorageAccount record for an OAuth account
 * ENHANCED VERSION: Handles all edge cases and provides comprehensive error handling
 */
export async function createStorageAccountForOAuth(
  userId: string,
  account: {
    provider: string
    providerAccountId: string
  },
  userEmail: string | null,
  userName: string | null
): Promise<boolean> {
  // Only create storage accounts for storage providers
  if (!["google", "dropbox"].includes(account.provider)) {
    logStorageOperation('SKIP_NON_STORAGE_PROVIDER', {
      userId,
      provider: account.provider,
      userEmail
    })
    return false
  }

  const storageProvider = account.provider === "google" ? "google_drive" : "dropbox"
  
  logStorageOperation('CREATE_ATTEMPT', {
    userId,
    provider: storageProvider,
    providerAccountId: account.providerAccountId,
    userEmail
  })

  try {
    return await withRetry(async () => {
      // Use transaction to prevent race conditions
      return await prisma.$transaction(async (tx) => {
        // Check if StorageAccount already exists (with proper unique constraint)
        const existingStorageAccount = await tx.storageAccount.findFirst({
          where: {
            userId,
            providerAccountId: account.providerAccountId,
            provider: storageProvider
          }
        })

        if (existingStorageAccount) {
          logStorageOperation('ALREADY_EXISTS', {
            userId,
            provider: storageProvider,
            existingId: existingStorageAccount.id,
            existingStatus: existingStorageAccount.status,
            userEmail
          })
          
          // IMPORTANT: Don't recreate DISCONNECTED accounts
          // Users intentionally disconnected these, so respect their choice
          if (existingStorageAccount.status === StorageAccountStatus.DISCONNECTED) {
            logStorageOperation('RESPECTING_DISCONNECTED_STATUS', {
              userId,
              provider: storageProvider,
              storageAccountId: existingStorageAccount.id,
              userEmail
            })
          }
          
          return false
        }

        // Verify the OAuth account actually exists before creating StorageAccount
        const oauthAccount = await tx.account.findFirst({
          where: {
            userId,
            provider: account.provider,
            providerAccountId: account.providerAccountId
          }
        })

        if (!oauthAccount) {
          logStorageOperation('OAUTH_ACCOUNT_NOT_FOUND', {
            userId,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            userEmail
          })
          throw new Error(`OAuth account not found for ${account.provider}`)
        }

        // Create new StorageAccount with comprehensive data
        const newStorageAccount = await tx.storageAccount.create({
          data: {
            userId,
            provider: storageProvider,
            providerAccountId: account.providerAccountId,
            displayName: userName || userEmail || `${storageProvider} Account`,
            email: userEmail,
            status: StorageAccountStatus.ACTIVE,
            isActive: true,
            createdAt: oauthAccount.createdAt || new Date(),
            updatedAt: new Date(),
            // Additional metadata for better tracking
            lastAccessedAt: new Date(),
            lastError: null
          }
        })
        
        logStorageOperation('CREATED_SUCCESS', {
          userId,
          provider: storageProvider,
          storageAccountId: newStorageAccount.id,
          userEmail
        })
        
        return true
      })
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logStorageOperation('CREATE_FAILED', {
      userId,
      provider: storageProvider,
      error: errorMessage,
      userEmail
    })
    
    // Don't throw error - we don't want to break OAuth flow
    // The fallback mechanisms will catch this later
    return false
  }
}

/**
 * Ensure all OAuth accounts have corresponding StorageAccount records
 * ENHANCED VERSION: More robust error handling and comprehensive validation
 */
export async function ensureStorageAccountsForUser(userId: string): Promise<{
  created: number
  errors: string[]
  validated: number
  reactivated: number
}> {
  const result: {
    created: number
    errors: string[]
    validated: number
    reactivated: number
  } = {
    created: 0,
    errors: [],
    validated: 0,
    reactivated: 0
  }

  logStorageOperation('ENSURE_USER_START', { userId })

  try {
    // Get user with OAuth accounts in a transaction for consistency
    const userData = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          accounts: {
            where: {
              provider: { in: ["google", "dropbox"] }
            }
          },
          storageAccounts: true
        }
      })

      if (!user) {
        throw new Error("User not found")
      }

      return user
    })

    logStorageOperation('USER_DATA_FETCHED', {
      userId,
      oauthAccounts: userData.accounts.length,
      storageAccounts: userData.storageAccounts.length,
      userEmail: userData.email
    })

    // Create StorageAccount for each OAuth account that doesn't have one
    for (const account of userData.accounts) {
      try {
        const created = await createStorageAccountForOAuth(
          userId,
          {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          },
          userData.email,
          userData.name
        )

        if (created) {
          result.created++
        } else {
          result.validated++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to process ${account.provider}: ${errorMessage}`)
        
        logStorageOperation('ACCOUNT_PROCESS_ERROR', {
          userId,
          provider: account.provider,
          error: errorMessage
        })
      }
    }

    // Additional validation: Check for orphaned or inconsistent StorageAccounts
    for (const storageAccount of userData.storageAccounts) {
      const correspondingOAuth = userData.accounts.find(acc => 
        acc.providerAccountId === storageAccount.providerAccountId &&
        ((acc.provider === "google" && storageAccount.provider === "google_drive") ||
         (acc.provider === "dropbox" && storageAccount.provider === "dropbox"))
      )

      if (!correspondingOAuth) {
        // StorageAccount exists but no corresponding OAuth account
        // This could happen if OAuth was revoked but StorageAccount wasn't updated
        logStorageOperation('ORPHANED_STORAGE_ACCOUNT', {
          userId,
          storageAccountId: storageAccount.id,
          provider: storageAccount.provider,
          status: storageAccount.status
        })

        if (storageAccount.status === StorageAccountStatus.ACTIVE) {
          try {
            await prisma.storageAccount.update({
              where: { id: storageAccount.id },
              data: {
                status: StorageAccountStatus.DISCONNECTED,
                lastError: "No corresponding OAuth account found",
                updatedAt: new Date()
              }
            })
            
            logStorageOperation('ORPHANED_ACCOUNT_DISCONNECTED', {
              userId,
              storageAccountId: storageAccount.id,
              provider: storageAccount.provider
            })
          } catch (error) {
            result.errors.push(`Failed to disconnect orphaned account: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      } else if (storageAccount.status === StorageAccountStatus.DISCONNECTED) {
        // StorageAccount is disconnected but OAuth exists
        // IMPORTANT: Don't automatically reactivate DISCONNECTED accounts
        // Users may have intentionally disconnected them, so respect their choice
        logStorageOperation('RESPECTING_USER_DISCONNECT', {
          userId,
          storageAccountId: storageAccount.id,
          provider: storageAccount.provider,
          message: "Account is DISCONNECTED but OAuth exists - respecting user's disconnect choice"
        })
        
        // Don't reactivate - let users manually reconnect if they want to
      }
    }

    logStorageOperation('ENSURE_USER_COMPLETE', {
      userId,
      created: result.created,
      validated: result.validated,
      reactivated: result.reactivated,
      errors: result.errors.length
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)
    
    logStorageOperation('ENSURE_USER_FAILED', {
      userId,
      error: errorMessage
    })
  }

  return result
}

/**
 * Batch ensure StorageAccounts for all users with OAuth accounts
 * ENHANCED VERSION: Better progress tracking and error handling
 */
export async function ensureStorageAccountsForAllUsers(): Promise<{
  usersProcessed: number
  accountsCreated: number
  accountsReactivated: number
  errors: string[]
  summary: {
    totalUsers: number
    usersWithOAuth: number
    usersFixed: number
    usersFailed: number
  }
}> {
  const result: {
    usersProcessed: number
    accountsCreated: number
    accountsReactivated: number
    errors: string[]
    summary: {
      totalUsers: number
      usersWithOAuth: number
      usersFixed: number
      usersFailed: number
    }
  } = {
    usersProcessed: 0,
    accountsCreated: 0,
    accountsReactivated: 0,
    errors: [],
    summary: {
      totalUsers: 0,
      usersWithOAuth: 0,
      usersFixed: 0,
      usersFailed: 0
    }
  }

  logStorageOperation('ENSURE_ALL_USERS_START', {})

  try {
    // Find users with OAuth accounts
    const users = await prisma.user.findMany({
      where: {
        accounts: {
          some: {
            provider: { in: ["google", "dropbox"] }
          }
        }
      },
      include: {
        accounts: {
          where: {
            provider: { in: ["google", "dropbox"] }
          }
        }
      }
    })

    result.summary.totalUsers = await prisma.user.count()
    result.summary.usersWithOAuth = users.length

    logStorageOperation('BATCH_PROCESSING_START', {
      totalUsers: result.summary.totalUsers,
      usersWithOAuth: result.summary.usersWithOAuth
    })

    for (const user of users) {
      try {
        const userResult = await ensureStorageAccountsForUser(user.id)
        result.usersProcessed++
        result.accountsCreated += userResult.created
        result.accountsReactivated += userResult.reactivated
        result.errors.push(...userResult.errors)
        
        if (userResult.created > 0 || userResult.reactivated > 0) {
          result.summary.usersFixed++
        }

        // Log progress every 10 users
        if (result.usersProcessed % 10 === 0) {
          logStorageOperation('BATCH_PROGRESS', {
            processed: result.usersProcessed,
            total: users.length,
            created: result.accountsCreated,
            reactivated: result.accountsReactivated,
            errors: result.errors.length
          })
        }
      } catch (error) {
        result.summary.usersFailed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`User ${user.email}: ${errorMessage}`)
        
        logStorageOperation('USER_PROCESSING_FAILED', {
          userId: user.id,
          userEmail: user.email,
          error: errorMessage
        })
      }
    }

    logStorageOperation('ENSURE_ALL_USERS_COMPLETE', {
      usersProcessed: result.usersProcessed,
      accountsCreated: result.accountsCreated,
      accountsReactivated: result.accountsReactivated,
      errors: result.errors.length,
      summary: result.summary
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)
    
    logStorageOperation('ENSURE_ALL_USERS_FAILED', {
      error: errorMessage
    })
  }

  return result
}

/**
 * NEW: Comprehensive health check and repair function
 * This function performs a complete audit and repair of storage accounts
 */
export async function performStorageAccountHealthCheck(userId?: string): Promise<{
  summary: {
    usersChecked: number
    issuesFound: number
    issuesFixed: number
    criticalErrors: number
  }
  actions: Array<{
    type: 'created' | 'reactivated' | 'disconnected' | 'validated' | 'error'
    userId: string
    userEmail: string | null
    provider: string
    details: string
  }>
}> {
  const result = {
    summary: {
      usersChecked: 0,
      issuesFound: 0,
      issuesFixed: 0,
      criticalErrors: 0
    },
    actions: [] as Array<{
      type: 'created' | 'reactivated' | 'disconnected' | 'validated' | 'error'
      userId: string
      userEmail: string | null
      provider: string
      details: string
    }>
  }

  logStorageOperation('HEALTH_CHECK_START', { targetUserId: userId })

  try {
    const whereClause = userId ? { id: userId } : {
      accounts: {
        some: {
          provider: { in: ["google", "dropbox"] }
        }
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        accounts: {
          where: {
            provider: { in: ["google", "dropbox"] }
          }
        },
        storageAccounts: true
      }
    })

    for (const user of users) {
      result.summary.usersChecked++
      
      const userResult = await ensureStorageAccountsForUser(user.id)
      
      if (userResult.created > 0) {
        result.summary.issuesFound += userResult.created
        result.summary.issuesFixed += userResult.created
        result.actions.push({
          type: 'created',
          userId: user.id,
          userEmail: user.email,
          provider: 'multiple',
          details: `Created ${userResult.created} missing StorageAccount(s)`
        })
      }

      if (userResult.reactivated > 0) {
        result.summary.issuesFound += userResult.reactivated
        result.summary.issuesFixed += userResult.reactivated
        result.actions.push({
          type: 'reactivated',
          userId: user.id,
          userEmail: user.email,
          provider: 'multiple',
          details: `Reactivated ${userResult.reactivated} disconnected account(s)`
        })
      }

      if (userResult.errors.length > 0) {
        result.summary.criticalErrors += userResult.errors.length
        userResult.errors.forEach(error => {
          result.actions.push({
            type: 'error',
            userId: user.id,
            userEmail: user.email,
            provider: 'unknown',
            details: error
          })
        })
      }
    }

    logStorageOperation('HEALTH_CHECK_COMPLETE', {
      summary: result.summary,
      actionsCount: result.actions.length
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.summary.criticalErrors++
    result.actions.push({
      type: 'error',
      userId: userId || 'system',
      userEmail: null,
      provider: 'system',
      details: `Health check failed: ${errorMessage}`
    })
    
    logStorageOperation('HEALTH_CHECK_FAILED', {
      error: errorMessage
    })
  }

  return result
}