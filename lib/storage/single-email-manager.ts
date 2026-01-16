/**
 * Single Email Storage Manager
 * Email is the KEY ID - users can only access storage accounts that match their login email
 * No connecting different email accounts - system automatically detects matching accounts
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"
import { handleStorageAccountStatusChange } from "./portal-management"

export interface SingleEmailStorageResult {
  success: boolean
  storageAccountId?: string
  created: boolean
  updated: boolean
  error?: string
  emailMismatch?: boolean
}

export class SingleEmailStorageManager {
  /**
   * Auto-detect and create storage account for user's email
   * CORE PRINCIPLE: Email is the key ID - only accounts matching user's login email
   */
  static async autoDetectStorageAccount(
    userId: string,
    provider: "google" | "dropbox",
    providerAccountId: string
  ): Promise<SingleEmailStorageResult> {
    const storageProvider = provider === "google" ? "google_drive" : "dropbox"

    console.log(`🔍 AUTO_DETECT: Auto-detecting storage account for ${provider}`)

    try {
      // Get user's login email - this is the ONLY email we work with
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })

      if (!user) {
        console.error(`❌ AUTO_DETECT: User ${userId} not found`)
        return {
          success: false,
          created: false,
          updated: false,
          error: "User not found"
        }
      }

      const userEmail = user.email
      console.log(`🔍 AUTO_DETECT: User login email: ${userEmail}`)

      // Enhanced validation for Google Drive
      if (provider === "google") {
        if (!userEmail) {
          console.error(`❌ GOOGLE_AUTO_DETECT: User ${userId} has no email address`)
          return {
            success: false,
            created: false,
            updated: false,
            error: "User has no email address - required for Google Drive integration"
          }
        }

        if (!providerAccountId) {
          console.error(`❌ GOOGLE_AUTO_DETECT: No provider account ID for user ${userId}`)
          return {
            success: false,
            created: false,
            updated: false,
            error: "No Google provider account ID provided"
          }
        }

        console.log(`🔍 GOOGLE_AUTO_DETECT: Validated - User: ${userEmail}, Provider ID: ${providerAccountId}`)
      }

      return await prisma.$transaction(async (tx: any) => {
        // Check if storage account already exists for this user/provider
        const existingStorageAccount = await tx.storageAccount.findFirst({
          where: {
            userId,
            provider: storageProvider
          }
        })

        if (existingStorageAccount) {
          // Update existing account - always use user's login email
          // IMPORTANT: Always reactivate the account regardless of current status
          const updatedAccount = await tx.storageAccount.update({
            where: { id: existingStorageAccount.id },
            data: {
              providerAccountId, // Update OAuth account ID
              email: userEmail, // Always use login email
              displayName: user.name || `${provider} Account`,
              status: StorageAccountStatus.ACTIVE, // Always set to ACTIVE
              isActive: true, // Always set to true
              lastError: null, // Clear any previous errors
              lastAccessedAt: new Date(),
              updatedAt: new Date()
            }
          })

          console.log(`✅ AUTO_DETECT: Updated existing storage account for ${provider} (status: ${existingStorageAccount.status} → ACTIVE)`)

          // Enhanced logging for Google Drive
          if (provider === "google") {
            console.log(`🎉 GOOGLE_AUTO_DETECT: Successfully updated Google Drive StorageAccount ${updatedAccount.id} for ${userEmail}`)
            console.log(`🔄 GOOGLE_AUTO_DETECT: Status changed from ${existingStorageAccount.status} to ACTIVE`)
          }

          return {
            success: true,
            storageAccountId: updatedAccount.id,
            created: false,
            updated: true
          }
        }

        // Create new storage account - always with user's login email
        try {
          const newStorageAccount = await tx.storageAccount.create({
            data: {
              userId,
              provider: storageProvider,
              providerAccountId,
              displayName: user.name || `${provider} Account`,
              email: userEmail, // ALWAYS user's login email
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastAccessedAt: new Date()
            }
          })

          console.log(`✅ AUTO_DETECT: Created new storage account for ${provider} with email ${userEmail}`)

          // Enhanced logging for Google Drive
          if (provider === "google") {
            console.log(`🎉 GOOGLE_AUTO_DETECT: Successfully created Google Drive StorageAccount ${newStorageAccount.id} for ${userEmail}`)
          }

          return {
            success: true,
            storageAccountId: newStorageAccount.id,
            created: true,
            updated: false
          }
        } catch (createError) {
          // Enhanced error handling for potential constraint violations
          console.error(`❌ AUTO_DETECT: Failed to create StorageAccount for ${provider}:`, createError)

          if (provider === "google") {
            console.error(`🚨 GOOGLE_AUTO_DETECT: StorageAccount creation failed for ${userEmail}`)
            console.error(`🚨 GOOGLE_AUTO_DETECT: Create error details:`, {
              userId,
              provider: storageProvider,
              providerAccountId,
              userEmail,
              error: createError instanceof Error ? createError.message : 'Unknown error'
            })
          }

          // Check if this is a unique constraint violation (account already exists)
          if (createError instanceof Error && createError.message.includes('unique constraint')) {
            console.log(`🔄 AUTO_DETECT: Unique constraint violation, attempting to find existing account`)

            // Try to find the existing account again (might have been created by another process)
            const existingAccount = await tx.storageAccount.findFirst({
              where: {
                userId,
                provider: storageProvider
              }
            })

            if (existingAccount) {
              console.log(`✅ AUTO_DETECT: Found existing account after constraint violation, updating it`)

              const updatedAccount = await tx.storageAccount.update({
                where: { id: existingAccount.id },
                data: {
                  providerAccountId,
                  email: userEmail,
                  displayName: user.name || `${provider} Account`,
                  status: StorageAccountStatus.ACTIVE,
                  isActive: true,
                  lastError: null,
                  lastAccessedAt: new Date(),
                  updatedAt: new Date()
                }
              })

              return {
                success: true,
                storageAccountId: updatedAccount.id,
                created: false,
                updated: true
              }
            }
          }

          throw createError // Re-throw if we can't handle it
        }
      })
    } catch (error) {
      console.error(`❌ AUTO_DETECT: Error managing storage account for ${provider}:`, error)

      // Enhanced error logging for Google Drive
      if (provider === "google") {
        console.error(`🚨 GOOGLE_AUTO_DETECT: Critical error for user ${userId}`)
        console.error(`🚨 GOOGLE_AUTO_DETECT: Error details:`, {
          userId,
          provider,
          providerAccountId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      }

      return {
        success: false,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get storage account for user and provider
   */
  static async getStorageAccount(userId: string, provider: "google" | "dropbox") {
    const storageProvider = provider === "google" ? "google_drive" : "dropbox"

    return await prisma.storageAccount.findFirst({
      where: {
        userId,
        provider: storageProvider
      }
    })
  }

  /**
   * Disconnect storage account (set to DISCONNECTED, remove OAuth)
   * User must reconnect through OAuth flow to restore access
   */
  static async disconnectStorageAccount(userId: string, provider: "google" | "dropbox") {
    const storageProvider = provider === "google" ? "google_drive" : "dropbox"

    try {
      // Get current storage accounts to track status changes
      const currentAccounts = await prisma.storageAccount.findMany({
        where: {
          userId,
          provider: storageProvider
        },
        select: {
          id: true,
          status: true,
          providerAccountId: true
        }
      })

      // Delete OAuth account(s) for this provider
      await prisma.account.deleteMany({
        where: {
          userId,
          provider
        }
      })

      // Update storage account status to DISCONNECTED
      const result = await prisma.storageAccount.updateMany({
        where: {
          userId,
          provider: storageProvider
        },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          isActive: false,
          lastError: "Disconnected by user",
          updatedAt: new Date()
        }
      })

      // Handle portal deactivation for each affected storage account
      let totalDeactivatedPortals = 0
      for (const account of currentAccounts) {
        if (account.status === StorageAccountStatus.ACTIVE) {
          const portalResult = await handleStorageAccountStatusChange(
            account.id,
            account.status,
            StorageAccountStatus.DISCONNECTED,
            "Storage account disconnected by user"
          )
          totalDeactivatedPortals += portalResult.deactivatedPortals
        }
      }

      return {
        success: true,
        disconnectedCount: result.count,
        deactivatedPortals: totalDeactivatedPortals
      }
    } catch (error) {
      console.error(`❌ DISCONNECT: Error disconnecting ${provider}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get simplified connected accounts for user
   * Shows only accounts that match user's login email
   * ENHANCED: More robust filtering and status reporting
   */
  static async getSimplifiedConnectedAccounts(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })

    if (!user) {
      return []
    }

    const storageAccounts = await prisma.storageAccount.findMany({
      where: {
        userId,
        provider: { in: ["google_drive", "dropbox"] }
      },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        status: true,
        isActive: true, // Keep for backward compatibility
        lastAccessedAt: true,
        createdAt: true
      }
    })

    console.log(`🔍 SIMPLIFIED_ACCOUNTS: Found ${storageAccounts.length} storage accounts for user ${userId}`)

    return storageAccounts.map((account: any) => {
      const provider = account.provider === "google_drive" ? "google" : "dropbox"
      const isActive = account.status === StorageAccountStatus.ACTIVE

      console.log(`🔍 SIMPLIFIED_ACCOUNTS: ${provider} - Status: ${account.status}, IsActive: ${isActive}`)

      return {
        id: account.id,
        provider,
        email: user.email, // Always show user's login email
        displayName: account.displayName,
        status: account.status,
        isActive, // Use status-based logic instead of deprecated field
        lastAccessedAt: account.lastAccessedAt,
        createdAt: account.createdAt
      }
    })
  }

  /**
   * Check if user has OAuth access for a provider
   * This determines if storage integration is available
   */
  /**
   * Check if user has OAuth access for a provider
   * This determines if storage integration is available
   * FIX: Determines the *correct* OAuth account to check, ignoring zombies
   */
  static async hasOAuthAccess(userId: string, provider: "google" | "dropbox") {
    const storageProvider = provider === "google" ? "google_drive" : "dropbox"

    // 1. First, check if we have a linked StorageAccount
    // This tells us WHICH providerAccountId is the "active" one
    const storageAccount = await prisma.storageAccount.findFirst({
      where: {
        userId,
        provider: storageProvider
      },
      select: {
        providerAccountId: true
      }
    })

    let oauthAccount = null;

    if (storageAccount?.providerAccountId) {
      // Precise Check: distinct lookup for the EXACT account linked to storage
      oauthAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: provider,
            providerAccountId: storageAccount.providerAccountId
          }
        },
        select: {
          access_token: true,
          expires_at: true,
          refresh_token: true // Check if we have refresh token too
        }
      })
    }

    // Fallback: If no storage account or specific OAuth account not found
    // (e.g. storage exists but oauth row was deleted, or new user)
    if (!oauthAccount) {
      // Find the MOST RECENT account (fix for multiple account rows)
      const accounts = await prisma.account.findMany({
        where: {
          userId,
          provider
        },
        orderBy: {
          createdAt: 'desc' // vital: check the newest one only
        },
        take: 1,
        select: {
          access_token: true,
          expires_at: true,
          refresh_token: true
        }
      })
      oauthAccount = accounts[0]
    }

    if (!oauthAccount || !oauthAccount.access_token) {
      return false
    }

    // Check if token is expired (with 1 minute buffer)
    const now = Math.floor(Date.now() / 1000)
    // If we have a refresh token, we consider it "active" because we can refresh it
    // But for this check, we mainly care if we HAVE the tokens
    // Ideally we should check validity, but existence is the first step

    // Strict expiry check only if we don't have a refresh token?
    // Actually, usually existence of record implies we 'have access' unless revoked
    // But let's stick to the expiry check if it's there
    if (oauthAccount.expires_at && oauthAccount.expires_at < now - 60) {
      // It's expired.
      // If we have a refresh_token, it's technically still "connectable" but might need refresh
      // For the UI "Is Connected" state, we usually return true if we have the refresh token
      // because the app handles refresh automatically.
      return !!oauthAccount.refresh_token;
    }

    return true
  }
}