/**
 * Google Drive OAuth Fix
 * 
 * This module addresses the specific issue where Google Drive OAuth accounts
 * are not reflecting in the system after authentication, while Dropbox works fine.
 */

import prisma from "@/lib/prisma"
import { SingleEmailStorageManager } from "./single-email-manager"
import { StorageAccountStatus } from "@prisma/client"

export interface GoogleOAuthDiagnostic {
  userId: string
  userEmail: string
  hasGoogleOAuth: boolean
  hasGoogleStorage: boolean
  googleOAuthDetails?: {
    providerAccountId: string
    hasAccessToken: boolean
    hasRefreshToken: boolean
    isExpired: boolean
    expiresAt?: number
  }
  googleStorageDetails?: {
    id: string
    status: StorageAccountStatus
    email?: string
    displayName: string
  }
  issue?: string
  recommendation?: string
}

export class GoogleOAuthFix {
  /**
   * Diagnose Google OAuth issues for a specific user
   */
  static async diagnoseUser(userId: string): Promise<GoogleOAuthDiagnostic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: { provider: 'google' }
        },
        storageAccounts: {
          where: { provider: 'google_drive' }
        }
      }
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    const googleOAuth = user.accounts[0]
    const googleStorage = user.storageAccounts[0]
    
    const diagnostic: GoogleOAuthDiagnostic = {
      userId,
      userEmail: user.email,
      hasGoogleOAuth: !!googleOAuth,
      hasGoogleStorage: !!googleStorage
    }

    if (googleOAuth) {
      const now = Math.floor(Date.now() / 1000)
      const isExpired = googleOAuth.expires_at ? googleOAuth.expires_at < now : false
      
      diagnostic.googleOAuthDetails = {
        providerAccountId: googleOAuth.providerAccountId,
        hasAccessToken: !!googleOAuth.access_token,
        hasRefreshToken: !!googleOAuth.refresh_token,
        isExpired,
        expiresAt: googleOAuth.expires_at || undefined
      }
    }

    if (googleStorage) {
      diagnostic.googleStorageDetails = {
        id: googleStorage.id,
        status: googleStorage.status,
        email: googleStorage.email || undefined,
        displayName: googleStorage.displayName
      }
    }

    // Identify the specific issue
    if (googleOAuth && !googleStorage) {
      diagnostic.issue = "MISSING_STORAGE_ACCOUNT"
      diagnostic.recommendation = "Run createMissingStorageAccount() to fix"
    } else if (googleOAuth && googleStorage && googleStorage.status !== StorageAccountStatus.ACTIVE) {
      diagnostic.issue = "DISCONNECTED_STORAGE_ACCOUNT"
      diagnostic.recommendation = "User needs to reconnect through OAuth flow"
    } else if (!googleOAuth) {
      diagnostic.issue = "NO_OAUTH_ACCOUNT"
      diagnostic.recommendation = "User needs to authenticate with Google"
    } else if (googleOAuth?.expires_at && googleOAuth.expires_at < Math.floor(Date.now() / 1000) && !googleOAuth.refresh_token) {
      diagnostic.issue = "EXPIRED_TOKEN_NO_REFRESH"
      diagnostic.recommendation = "User needs to re-authenticate with Google"
    }

    return diagnostic
  }

  /**
   * Fix missing StorageAccount for users who have Google OAuth but no StorageAccount
   */
  static async createMissingStorageAccount(userId: string): Promise<{
    success: boolean
    error?: string
    storageAccountId?: string
  }> {
    try {
      console.log(`🔧 GOOGLE_FIX: Creating missing StorageAccount for user ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: {
            where: { provider: 'google' }
          }
        }
      })

      if (!user) {
        return { success: false, error: "User not found" }
      }

      const googleOAuth = user.accounts[0]
      if (!googleOAuth) {
        return { success: false, error: "No Google OAuth account found" }
      }

      // Use the SingleEmailStorageManager to create the StorageAccount
      const result = await SingleEmailStorageManager.autoDetectStorageAccount(
        userId,
        'google',
        googleOAuth.providerAccountId
      )

      if (result.success) {
        console.log(`✅ GOOGLE_FIX: Successfully created StorageAccount ${result.storageAccountId}`)
        return {
          success: true,
          storageAccountId: result.storageAccountId
        }
      } else {
        console.log(`❌ GOOGLE_FIX: Failed to create StorageAccount: ${result.error}`)
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error(`❌ GOOGLE_FIX: Exception creating StorageAccount:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reconnect disconnected Google Drive StorageAccounts
   * This uses the autoDetectStorageAccount method which will reactivate the account
   */
  static async reconnectStorageAccount(userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`🔧 GOOGLE_FIX: Reconnecting StorageAccount for user ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: {
            where: { provider: 'google' }
          }
        }
      })

      if (!user) {
        return { success: false, error: "User not found" }
      }

      const googleOAuth = user.accounts[0]
      if (!googleOAuth) {
        return { success: false, error: "No Google OAuth account found - user needs to authenticate" }
      }

      // Use autoDetectStorageAccount which will reactivate disconnected accounts
      const result = await SingleEmailStorageManager.autoDetectStorageAccount(
        userId,
        'google',
        googleOAuth.providerAccountId
      )
      
      if (result.success) {
        console.log(`✅ GOOGLE_FIX: Successfully reconnected StorageAccount`)
        return { success: true }
      } else {
        console.log(`❌ GOOGLE_FIX: Failed to reconnect StorageAccount: ${result.error}`)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error(`❌ GOOGLE_FIX: Exception reconnecting StorageAccount:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Comprehensive fix for all Google OAuth issues
   */
  static async fixAllGoogleOAuthIssues(): Promise<{
    totalUsers: number
    fixedUsers: number
    failedUsers: number
    issues: Array<{
      userId: string
      userEmail: string
      issue: string
      fixed: boolean
      error?: string
    }>
  }> {
    console.log(`🔧 GOOGLE_FIX: Starting comprehensive Google OAuth fix...`)
    
    const results = {
      totalUsers: 0,
      fixedUsers: 0,
      failedUsers: 0,
      issues: [] as Array<{
        userId: string
        userEmail: string
        issue: string
        fixed: boolean
        error?: string
      }>
    }

    try {
      // Find all users with Google OAuth accounts
      const usersWithGoogleOAuth = await prisma.user.findMany({
        where: {
          accounts: {
            some: {
              provider: 'google'
            }
          }
        },
        include: {
          accounts: {
            where: { provider: 'google' }
          },
          storageAccounts: {
            where: { provider: 'google_drive' }
          }
        }
      })

      results.totalUsers = usersWithGoogleOAuth.length
      console.log(`📊 GOOGLE_FIX: Found ${results.totalUsers} users with Google OAuth`)

      for (const user of usersWithGoogleOAuth) {
        const diagnostic = await this.diagnoseUser(user.id)
        
        if (diagnostic.issue) {
          console.log(`🔍 GOOGLE_FIX: User ${user.email} has issue: ${diagnostic.issue}`)
          
          let fixed = false
          let error: string | undefined

          try {
            if (diagnostic.issue === "MISSING_STORAGE_ACCOUNT") {
              const fixResult = await this.createMissingStorageAccount(user.id)
              fixed = fixResult.success
              error = fixResult.error
            } else if (diagnostic.issue === "DISCONNECTED_STORAGE_ACCOUNT") {
              const fixResult = await this.reconnectStorageAccount(user.id)
              fixed = fixResult.success
              error = fixResult.error
            }
          } catch (fixError) {
            fixed = false
            error = fixError instanceof Error ? fixError.message : 'Unknown error'
          }

          results.issues.push({
            userId: user.id,
            userEmail: user.email,
            issue: diagnostic.issue,
            fixed,
            error
          })

          if (fixed) {
            results.fixedUsers++
            console.log(`✅ GOOGLE_FIX: Fixed issue for ${user.email}`)
          } else {
            results.failedUsers++
            console.log(`❌ GOOGLE_FIX: Failed to fix issue for ${user.email}: ${error}`)
          }
        }
      }

      console.log(`🎯 GOOGLE_FIX: Complete! Fixed ${results.fixedUsers}/${results.totalUsers} users`)
      return results

    } catch (error) {
      console.error(`❌ GOOGLE_FIX: Comprehensive fix failed:`, error)
      throw error
    }
  }

  /**
   * Enhanced OAuth linkAccount handler specifically for Google
   * This should be called from auth.ts linkAccount event
   */
  static async handleGoogleOAuthLink(
    userId: string,
    providerAccountId: string,
    userEmail: string,
    userName?: string
  ): Promise<{
    success: boolean
    created: boolean
    updated: boolean
    error?: string
    storageAccountId?: string
  }> {
    console.log(`🔗 GOOGLE_OAUTH_LINK: Handling Google OAuth link for user ${userId}`)
    
    try {
      // Use a transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // First, check if StorageAccount already exists
        const existingStorage = await tx.storageAccount.findFirst({
          where: {
            userId,
            provider: 'google_drive'
          }
        })

        if (existingStorage) {
          // Update existing StorageAccount
          const updatedStorage = await tx.storageAccount.update({
            where: { id: existingStorage.id },
            data: {
              providerAccountId,
              email: userEmail,
              displayName: userName || 'Google Drive Account',
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              lastError: null,
              lastAccessedAt: new Date(),
              updatedAt: new Date()
            }
          })

          console.log(`✅ GOOGLE_OAUTH_LINK: Updated existing StorageAccount ${updatedStorage.id}`)
          return {
            success: true,
            created: false,
            updated: true,
            storageAccountId: updatedStorage.id
          }
        } else {
          // Create new StorageAccount
          const newStorage = await tx.storageAccount.create({
            data: {
              userId,
              provider: 'google_drive',
              providerAccountId,
              displayName: userName || 'Google Drive Account',
              email: userEmail,
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastAccessedAt: new Date()
            }
          })

          console.log(`✅ GOOGLE_OAUTH_LINK: Created new StorageAccount ${newStorage.id}`)
          return {
            success: true,
            created: true,
            updated: false,
            storageAccountId: newStorage.id
          }
        }
      })

      return result
    } catch (error) {
      console.error(`❌ GOOGLE_OAUTH_LINK: Failed for user ${userId}:`, error)
      return {
        success: false,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}