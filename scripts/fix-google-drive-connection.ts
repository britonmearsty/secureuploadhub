/**
 * Google Drive Connection Fix Script
 * 
 * This script diagnoses and fixes Google Drive storage account issues
 * where OAuth is valid but storage account is DISCONNECTED
 */

import prisma from "@/lib/prisma"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"
import { StorageAccountStatus } from "@prisma/client"

interface GoogleDriveDiagnostic {
  userId: string
  userEmail: string
  hasGoogleOAuth: boolean
  hasGoogleStorage: boolean
  googleOAuthDetails?: {
    providerAccountId: string
    hasAccessToken: boolean
    hasRefreshToken: boolean
    isExpired: boolean
  }
  googleStorageDetails?: {
    id: string
    status: StorageAccountStatus
    email?: string
    displayName: string
  }
  issue?: string
  fixApplied?: boolean
  error?: string
}

export async function diagnoseGoogleDriveConnections(): Promise<GoogleDriveDiagnostic[]> {
  console.log('🔍 GOOGLE_DRIVE_FIX: Starting comprehensive Google Drive connection diagnosis...')
  
  const results: GoogleDriveDiagnostic[] = []
  
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

    console.log(`📊 GOOGLE_DRIVE_FIX: Found ${usersWithGoogleOAuth.length} users with Google OAuth`)

    for (const user of usersWithGoogleOAuth) {
      const googleOAuth = user.accounts[0] // Should only be one Google account per user
      const googleStorage = user.storageAccounts[0] // Should only be one Google Drive storage per user
      
      const diagnostic: GoogleDriveDiagnostic = {
        userId: user.id,
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
          isExpired
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
        console.log(`🔍 GOOGLE_DRIVE_FIX: User ${user.email} - Missing StorageAccount`)
      } else if (googleOAuth && googleStorage && googleStorage.status !== StorageAccountStatus.ACTIVE) {
        diagnostic.issue = "DISCONNECTED_STORAGE_ACCOUNT"
        console.log(`🔍 GOOGLE_DRIVE_FIX: User ${user.email} - StorageAccount is ${googleStorage.status}`)
      } else if (!googleOAuth) {
        diagnostic.issue = "NO_OAUTH_ACCOUNT"
        console.log(`🔍 GOOGLE_DRIVE_FIX: User ${user.email} - No OAuth account`)
      } else if (googleOAuth?.expires_at && googleOAuth.expires_at < Math.floor(Date.now() / 1000) && !googleOAuth.refresh_token) {
        diagnostic.issue = "EXPIRED_TOKEN_NO_REFRESH"
        console.log(`🔍 GOOGLE_DRIVE_FIX: User ${user.email} - Expired token without refresh`)
      } else {
        console.log(`✅ GOOGLE_DRIVE_FIX: User ${user.email} - Google Drive connection is healthy`)
      }

      results.push(diagnostic)
    }

    return results

  } catch (error) {
    console.error(`❌ GOOGLE_DRIVE_FIX: Diagnosis failed:`, error)
    throw error
  }
}

export async function fixGoogleDriveConnection(userId: string): Promise<{
  success: boolean
  error?: string
  storageAccountId?: string
  action?: string
}> {
  try {
    console.log(`🔧 GOOGLE_DRIVE_FIX: Fixing Google Drive connection for user ${userId}`)
    
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
      return { success: false, error: "User not found" }
    }

    const googleOAuth = user.accounts[0]
    const googleStorage = user.storageAccounts[0]

    if (!googleOAuth) {
      return { success: false, error: "No Google OAuth account found - user needs to authenticate" }
    }

    // Case 1: Missing StorageAccount - Create it
    if (!googleStorage) {
      console.log(`🔧 GOOGLE_DRIVE_FIX: Creating missing StorageAccount for user ${user.email}`)
      
      const result = await SingleEmailStorageManager.autoDetectStorageAccount(
        userId,
        'google',
        googleOAuth.providerAccountId
      )

      if (result.success) {
        console.log(`✅ GOOGLE_DRIVE_FIX: Successfully created StorageAccount ${result.storageAccountId}`)
        return {
          success: true,
          storageAccountId: result.storageAccountId,
          action: 'CREATED_STORAGE_ACCOUNT'
        }
      } else {
        console.log(`❌ GOOGLE_DRIVE_FIX: Failed to create StorageAccount: ${result.error}`)
        return {
          success: false,
          error: result.error,
          action: 'CREATE_FAILED'
        }
      }
    }

    // Case 2: StorageAccount exists but is DISCONNECTED - Reactivate it
    if (googleStorage.status !== StorageAccountStatus.ACTIVE) {
      console.log(`🔧 GOOGLE_DRIVE_FIX: Reactivating StorageAccount ${googleStorage.id} (status: ${googleStorage.status})`)
      
      const result = await SingleEmailStorageManager.autoDetectStorageAccount(
        userId,
        'google',
        googleOAuth.providerAccountId
      )
      
      if (result.success) {
        console.log(`✅ GOOGLE_DRIVE_FIX: Successfully reactivated StorageAccount`)
        return { 
          success: true, 
          storageAccountId: googleStorage.id,
          action: 'REACTIVATED_STORAGE_ACCOUNT'
        }
      } else {
        console.log(`❌ GOOGLE_DRIVE_FIX: Failed to reactivate StorageAccount: ${result.error}`)
        return { 
          success: false, 
          error: result.error,
          action: 'REACTIVATE_FAILED'
        }
      }
    }

    // Case 3: Everything looks good
    console.log(`✅ GOOGLE_DRIVE_FIX: Google Drive connection is already healthy for user ${user.email}`)
    return {
      success: true,
      storageAccountId: googleStorage.id,
      action: 'ALREADY_HEALTHY'
    }

  } catch (error) {
    console.error(`❌ GOOGLE_DRIVE_FIX: Exception fixing connection:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'EXCEPTION'
    }
  }
}

export async function fixAllGoogleDriveConnections(): Promise<{
  totalUsers: number
  fixedUsers: number
  failedUsers: number
  results: Array<{
    userId: string
    userEmail: string
    issue?: string
    fixed: boolean
    action?: string
    error?: string
  }>
}> {
  console.log(`🔧 GOOGLE_DRIVE_FIX: Starting comprehensive Google Drive connection fix...`)
  
  const summary = {
    totalUsers: 0,
    fixedUsers: 0,
    failedUsers: 0,
    results: [] as Array<{
      userId: string
      userEmail: string
      issue?: string
      fixed: boolean
      action?: string
      error?: string
    }>
  }

  try {
    const diagnostics = await diagnoseGoogleDriveConnections()
    summary.totalUsers = diagnostics.length

    for (const diagnostic of diagnostics) {
      if (diagnostic.issue) {
        console.log(`🔧 GOOGLE_DRIVE_FIX: Fixing ${diagnostic.issue} for user ${diagnostic.userEmail}`)
        
        const fixResult = await fixGoogleDriveConnection(diagnostic.userId)
        
        summary.results.push({
          userId: diagnostic.userId,
          userEmail: diagnostic.userEmail,
          issue: diagnostic.issue,
          fixed: fixResult.success,
          action: fixResult.action,
          error: fixResult.error
        })

        if (fixResult.success) {
          summary.fixedUsers++
          console.log(`✅ GOOGLE_DRIVE_FIX: Fixed ${diagnostic.issue} for user ${diagnostic.userEmail}`)
        } else {
          summary.failedUsers++
          console.log(`❌ GOOGLE_DRIVE_FIX: Failed to fix ${diagnostic.issue} for user ${diagnostic.userEmail}: ${fixResult.error}`)
        }
      } else {
        summary.results.push({
          userId: diagnostic.userId,
          userEmail: diagnostic.userEmail,
          fixed: true,
          action: 'ALREADY_HEALTHY'
        })
      }
    }

    console.log(`🎯 GOOGLE_DRIVE_FIX: Complete! Fixed ${summary.fixedUsers}/${summary.totalUsers} users`)
    return summary

  } catch (error) {
    console.error(`❌ GOOGLE_DRIVE_FIX: Comprehensive fix failed:`, error)
    throw error
  }
}

// CLI usage
if (require.main === module) {
  fixAllGoogleDriveConnections()
    .then((result) => {
      console.log('\n📊 FINAL RESULTS:')
      console.log(`Total users: ${result.totalUsers}`)
      console.log(`Fixed users: ${result.fixedUsers}`)
      console.log(`Failed users: ${result.failedUsers}`)
      
      if (result.results.length > 0) {
        console.log('\n📋 DETAILED RESULTS:')
        result.results.forEach(r => {
          const status = r.fixed ? '✅' : '❌'
          console.log(`${status} ${r.userEmail}: ${r.action || r.error}`)
        })
      }
      
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}