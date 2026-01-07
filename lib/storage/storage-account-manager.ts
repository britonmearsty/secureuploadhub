/**
 * StorageAccount Manager - Single Source of Truth
 * Centralized, race-condition-free StorageAccount management
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"
import { withDistributedLock, withInMemoryLock } from "@/lib/distributed-lock"
import { 
  withIdempotency, 
  withInMemoryIdempotency, 
  StorageAccountIdempotency 
} from "@/lib/idempotency"

/**
 * Enhanced logging for storage account operations
 */
function logStorageOperation(operation: string, details: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] STORAGE_MANAGER: ${operation}`, details)
}

/**
 * StorageAccount creation result
 */
export interface StorageAccountCreationResult {
  success: boolean
  storageAccountId?: string
  created: boolean
  existed: boolean
  error?: string
  details: {
    userId: string
    provider: string
    providerAccountId: string
    operation: string
  }
}

/**
 * StorageAccount Manager Class
 * Provides centralized, thread-safe StorageAccount operations
 */
export class StorageAccountManager {
  /**
   * Create or get existing StorageAccount with full race condition protection
   * This is the SINGLE SOURCE OF TRUTH for StorageAccount creation
   */
  static async createOrGetStorageAccount(
    userId: string,
    account: {
      provider: string
      providerAccountId: string
    },
    userEmail: string | null,
    userName: string | null,
    options: {
      forceCreate?: boolean
      respectDisconnected?: boolean
    } = {}
  ): Promise<StorageAccountCreationResult> {
    const { forceCreate = false, respectDisconnected = true } = options

    // Only create storage accounts for storage providers
    if (!["google", "dropbox"].includes(account.provider)) {
      return {
        success: false,
        created: false,
        existed: false,
        error: `Invalid storage provider: ${account.provider}`,
        details: {
          userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          operation: 'INVALID_PROVIDER'
        }
      }
    }

    const storageProvider = account.provider === "google" ? "google_drive" : "dropbox"
    
    // Generate distributed lock key
    const lockKey = `storage-account:${userId}:${storageProvider}:${account.providerAccountId}`
    
    // Generate idempotency key
    const idempotencyKey = StorageAccountIdempotency.createKey(
      userId,
      storageProvider,
      account.providerAccountId
    )

    logStorageOperation('CREATE_OR_GET_START', {
      userId,
      provider: storageProvider,
      providerAccountId: account.providerAccountId,
      lockKey,
      idempotencyKey,
      forceCreate,
      respectDisconnected
    })

    try {
      // Use distributed locking with idempotency
      const lockOperation = async () => {
        return await this.executeIdempotentStorageAccountCreation(
          userId,
          storageProvider,
          account.providerAccountId,
          userEmail,
          userName,
          idempotencyKey,
          { forceCreate, respectDisconnected }
        )
      }

      // Use in-memory locking (Redis not implemented yet)
      const result = await withInMemoryLock(lockKey, lockOperation, 30000)

      logStorageOperation('CREATE_OR_GET_COMPLETE', {
        userId,
        provider: storageProvider,
        result: {
          success: result.success,
          created: result.created,
          existed: result.existed,
          storageAccountId: result.storageAccountId
        }
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logStorageOperation('CREATE_OR_GET_FAILED', {
        userId,
        provider: storageProvider,
        error: errorMessage
      })

      return {
        success: false,
        created: false,
        existed: false,
        error: errorMessage,
        details: {
          userId,
          provider: storageProvider,
          providerAccountId: account.providerAccountId,
          operation: 'LOCK_FAILED'
        }
      }
    }
  }

  /**
   * Execute idempotent StorageAccount creation
   */
  private static async executeIdempotentStorageAccountCreation(
    userId: string,
    storageProvider: string,
    providerAccountId: string,
    userEmail: string | null,
    userName: string | null,
    idempotencyKey: string,
    options: {
      forceCreate: boolean
      respectDisconnected: boolean
    }
  ): Promise<StorageAccountCreationResult> {
    const { forceCreate, respectDisconnected } = options

    const operation = async (): Promise<StorageAccountCreationResult> => {
      return await this.executeStorageAccountCreation(
        userId,
        storageProvider,
        providerAccountId,
        userEmail,
        userName,
        { forceCreate, respectDisconnected }
      )
    }

    try {
      // Use idempotency protection (in-memory for now)
      const idempotencyResult = await withInMemoryIdempotency(
        idempotencyKey,
        operation,
        300 // 5 minute cache
      )

      return {
        ...idempotencyResult.result,
        details: {
          ...idempotencyResult.result.details,
          operation: idempotencyResult.fromCache ? 'CACHED' : 'EXECUTED'
        }
      }
    } catch (idempotencyError) {
      logStorageOperation('IDEMPOTENCY_FAILED', {
        userId,
        provider: storageProvider,
        error: idempotencyError instanceof Error ? idempotencyError.message : 'Unknown error',
        fallbackToDirect: true
      })

      // Fallback to direct execution
      return await operation()
    }
  }

  /**
   * Core StorageAccount creation logic
   */
  private static async executeStorageAccountCreation(
    userId: string,
    storageProvider: string,
    providerAccountId: string,
    userEmail: string | null,
    userName: string | null,
    options: {
      forceCreate: boolean
      respectDisconnected: boolean
    }
  ): Promise<StorageAccountCreationResult> {
    const { forceCreate, respectDisconnected } = options

    logStorageOperation('EXECUTE_CREATION_START', {
      userId,
      provider: storageProvider,
      providerAccountId,
      forceCreate,
      respectDisconnected
    })

    try {
      return await prisma.$transaction(async (tx) => {
        // Check if StorageAccount already exists
        const existingStorageAccount = await tx.storageAccount.findFirst({
          where: {
            userId,
            providerAccountId,
            provider: storageProvider
          }
        })

        if (existingStorageAccount) {
          logStorageOperation('EXISTING_ACCOUNT_FOUND', {
            userId,
            provider: storageProvider,
            storageAccountId: existingStorageAccount.id,
            status: existingStorageAccount.status,
            forceCreate
          })

          // Handle existing account based on status and options
          if (existingStorageAccount.status === StorageAccountStatus.DISCONNECTED) {
            if (respectDisconnected && !forceCreate) {
              logStorageOperation('RESPECTING_DISCONNECTED_STATUS', {
                userId,
                provider: storageProvider,
                storageAccountId: existingStorageAccount.id
              })

              return {
                success: true,
                storageAccountId: existingStorageAccount.id,
                created: false,
                existed: true,
                details: {
                  userId,
                  provider: storageProvider,
                  providerAccountId,
                  operation: 'EXISTING_DISCONNECTED'
                }
              }
            } else if (forceCreate) {
              // Reactivate disconnected account
              const reactivatedAccount = await tx.storageAccount.update({
                where: { id: existingStorageAccount.id },
                data: {
                  status: StorageAccountStatus.ACTIVE,
                  isActive: true,
                  lastError: null,
                  lastAccessedAt: new Date(),
                  updatedAt: new Date()
                }
              })

              logStorageOperation('REACTIVATED_ACCOUNT', {
                userId,
                provider: storageProvider,
                storageAccountId: reactivatedAccount.id
              })

              return {
                success: true,
                storageAccountId: reactivatedAccount.id,
                created: false,
                existed: true,
                details: {
                  userId,
                  provider: storageProvider,
                  providerAccountId,
                  operation: 'REACTIVATED'
                }
              }
            }
          }

          // Account exists and is not disconnected, or we're not respecting disconnected status
          return {
            success: true,
            storageAccountId: existingStorageAccount.id,
            created: false,
            existed: true,
            details: {
              userId,
              provider: storageProvider,
              providerAccountId,
              operation: 'EXISTING_ACTIVE'
            }
          }
        }

        // Verify the OAuth account exists before creating StorageAccount
        const oauthAccount = await tx.account.findFirst({
          where: {
            userId,
            provider: storageProvider === "google_drive" ? "google" : "dropbox",
            providerAccountId
          }
        })

        if (!oauthAccount) {
          logStorageOperation('OAUTH_ACCOUNT_NOT_FOUND', {
            userId,
            provider: storageProvider,
            providerAccountId
          })

          return {
            success: false,
            created: false,
            existed: false,
            error: `OAuth account not found for ${storageProvider}`,
            details: {
              userId,
              provider: storageProvider,
              providerAccountId,
              operation: 'OAUTH_NOT_FOUND'
            }
          }
        }

        // Create new StorageAccount
        const newStorageAccount = await tx.storageAccount.create({
          data: {
            userId,
            provider: storageProvider,
            providerAccountId,
            displayName: userName || userEmail || `${storageProvider} Account`,
            email: userEmail,
            status: StorageAccountStatus.ACTIVE,
            isActive: true,
            createdAt: oauthAccount.createdAt || new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            lastError: null
          }
        })

        logStorageOperation('CREATED_NEW_ACCOUNT', {
          userId,
          provider: storageProvider,
          storageAccountId: newStorageAccount.id,
          displayName: newStorageAccount.displayName
        })

        return {
          success: true,
          storageAccountId: newStorageAccount.id,
          created: true,
          existed: false,
          details: {
            userId,
            provider: storageProvider,
            providerAccountId,
            operation: 'CREATED'
          }
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logStorageOperation('CREATION_FAILED', {
        userId,
        provider: storageProvider,
        error: errorMessage
      })

      return {
        success: false,
        created: false,
        existed: false,
        error: errorMessage,
        details: {
          userId,
          provider: storageProvider,
          providerAccountId,
          operation: 'FAILED'
        }
      }
    }
  }

  /**
   * Ensure all OAuth accounts have StorageAccounts
   * Uses the centralized creation method
   */
  static async ensureStorageAccountsForUser(
    userId: string,
    options: {
      forceCreate?: boolean
      respectDisconnected?: boolean
    } = {}
  ): Promise<{
    created: number
    reactivated: number
    validated: number
    errors: string[]
    details: StorageAccountCreationResult[]
  }> {
    const { forceCreate = false, respectDisconnected = true } = options

    const lockKey = `ensure-storage-accounts:${userId}`
    const idempotencyKey = StorageAccountIdempotency.ensureUserKey(userId)

    logStorageOperation('ENSURE_USER_START', {
      userId,
      lockKey,
      idempotencyKey,
      forceCreate,
      respectDisconnected
    })

    const operation = async () => {
      const result = {
        created: 0,
        reactivated: 0,
        validated: 0,
        errors: [] as string[],
        details: [] as StorageAccountCreationResult[]
      }

      try {
        // Get user with OAuth accounts
        const userData = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            accounts: {
              where: {
                provider: { in: ["google", "dropbox"] }
              }
            }
          }
        })

        if (!userData) {
          result.errors.push("User not found")
          return result
        }

        logStorageOperation('USER_OAUTH_ACCOUNTS_FOUND', {
          userId,
          accountCount: userData.accounts.length,
          accounts: userData.accounts.map(acc => ({
            provider: acc.provider,
            providerAccountId: acc.providerAccountId
          }))
        })

        // Process each OAuth account
        for (const account of userData.accounts) {
          try {
            const creationResult = await this.createOrGetStorageAccount(
              userId,
              {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              },
              userData.email,
              userData.name,
              { forceCreate, respectDisconnected }
            )

            result.details.push(creationResult)

            if (creationResult.success) {
              if (creationResult.created) {
                result.created++
              } else if (creationResult.details.operation === 'REACTIVATED') {
                result.reactivated++
              } else {
                result.validated++
              }
            } else {
              result.errors.push(
                `${account.provider}: ${creationResult.error || 'Unknown error'}`
              )
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            result.errors.push(`${account.provider}: ${errorMessage}`)
            
            logStorageOperation('ACCOUNT_PROCESS_ERROR', {
              userId,
              provider: account.provider,
              error: errorMessage
            })
          }
        }

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(errorMessage)
        return result
      }
    }

    try {
      // Use distributed locking with idempotency (in-memory for now)
      const lockOperation = async () => {
        try {
          const idempotencyResult = await withInMemoryIdempotency(
            idempotencyKey,
            operation,
            300 // 5 minutes
          )
          return idempotencyResult.result
        } catch (idempotencyError) {
          logStorageOperation('IDEMPOTENCY_FAILED_FALLBACK', {
            userId,
            error: idempotencyError instanceof Error ? idempotencyError.message : 'Unknown error'
          })
          return await operation()
        }
      }

      // Use in-memory locking (Redis not implemented yet)
      const result = await withInMemoryLock(lockKey, lockOperation, 60000)

      logStorageOperation('ENSURE_USER_COMPLETE', {
        userId,
        created: result.created,
        reactivated: result.reactivated,
        validated: result.validated,
        errors: result.errors.length
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logStorageOperation('ENSURE_USER_FAILED', {
        userId,
        error: errorMessage
      })

      return {
        created: 0,
        reactivated: 0,
        validated: 0,
        errors: [errorMessage],
        details: []
      }
    }
  }
}