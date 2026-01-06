// Cloud Storage Service - Main entry point

import prisma from "@/lib/prisma"
import { googleDriveService } from "./google-drive"
import { dropboxService } from "./dropbox"
import { CloudStorageService, StorageProvider, UploadResult, StorageFolder } from "./types"
import { StorageAccountStatus } from "./account-states"

export * from "./types"

/**
 * Update storage account status when OAuth token operations fail
 */
async function updateStorageAccountStatusOnTokenFailure(
  userId: string,
  provider: "google" | "dropbox",
  errorMessage: string
): Promise<void> {
  try {
    // Find storage accounts for this user and provider
    const storageAccounts = await prisma.storageAccount.findMany({
      where: {
        userId,
        provider: provider === "google" ? "google_drive" : "dropbox",
        status: { not: StorageAccountStatus.DISCONNECTED } // Only update if not already disconnected
      }
    })

    if (storageAccounts.length > 0) {
      // Update all matching storage accounts to DISCONNECTED
      await prisma.storageAccount.updateMany({
        where: {
          id: { in: storageAccounts.map(sa => sa.id) }
        },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          lastError: errorMessage,
          updatedAt: new Date()
        }
      })

      console.log(`Updated ${storageAccounts.length} storage account(s) to DISCONNECTED for user ${userId} (${provider})`)
    }
  } catch (error) {
    console.error("Failed to update storage account status on token failure:", error)
  }
}

/**
 * Get the appropriate cloud storage service for a provider
 */
export function getStorageService(provider: StorageProvider): CloudStorageService | null {
  switch (provider) {
    case "google_drive":
      return googleDriveService
    case "dropbox":
      return dropboxService
    default:
      return null
  }
}

/**
 * Get a valid access token for a user's account, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string,
  provider: "google" | "dropbox"
): Promise<{ accessToken: string; providerAccountId: string } | null> {
  // Find the user's account for this provider
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider,
    },
  })

  if (!account || !account.access_token) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const isExpired = account.expires_at && account.expires_at < now - 60 // 1 minute buffer

  if (isExpired && account.refresh_token) {
    // Token is expired, refresh it
    const storageProvider = provider === "google" ? "google_drive" : "dropbox"
    const service = getStorageService(storageProvider)

    if (!service) {
      return null
    }

    try {
      const { accessToken, expiresAt } = await service.refreshAccessToken(
        account.refresh_token
      )

      // Update the token in the database
      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        data: {
          access_token: accessToken,
          expires_at: expiresAt,
        },
      })

      return { accessToken, providerAccountId: account.providerAccountId }
    } catch (error) {
      console.error(`Failed to refresh ${provider} token for user ${userId}:`, error)
      
      // Update storage account status to DISCONNECTED when token refresh fails
      await updateStorageAccountStatusOnTokenFailure(userId, provider, error instanceof Error ? error.message : "Token refresh failed")
      
      return null
    }
  }

  if (isExpired && !account.refresh_token) {
    console.warn(`Token for ${provider} is expired and no refresh token is available for user ${userId}`)
    
    // Update storage account status to DISCONNECTED when no refresh token available
    await updateStorageAccountStatusOnTokenFailure(userId, provider, "No refresh token available")
    
    return null
  }

  return { accessToken: account.access_token, providerAccountId: account.providerAccountId }
}

/**
 * Get all connected storage accounts for a user
 * This checks both OAuth accounts AND storage account status
 */
export async function getConnectedAccounts(userId: string) {
  console.log('🔍 getConnectedAccounts: Starting for userId:', userId)
  
  // Get OAuth accounts (for authentication)
  const oauthAccounts = await prisma.account.findMany({
    where: {
      userId,
      provider: { in: ["google", "dropbox"] },
    },
    select: {
      provider: true,
      providerAccountId: true,
      access_token: true,
      expires_at: true,
    },
  })
  
  console.log('🔍 getConnectedAccounts: Found OAuth accounts:', oauthAccounts.length)

  // Get storage accounts (for file storage)
  const storageAccounts = await prisma.storageAccount.findMany({
    where: {
      userId,
      provider: { in: ["google_drive", "dropbox"] }
    },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      status: true,
      email: true,
      displayName: true
    }
  })
  
  console.log('🔍 getConnectedAccounts: Found storage accounts:', storageAccounts.length)

  const result: Array<{
    provider: "google" | "dropbox"
    providerAccountId: string
    email?: string
    name?: string
    isConnected: boolean
    storageAccountId?: string
    storageStatus?: string
    isAuthAccount: boolean // Indicates if this is used for login
    hasValidOAuth: boolean // NEW: Separate OAuth status from storage status
  }> = []

  for (const oauthAccount of oauthAccounts) {
    console.log(`🔍 getConnectedAccounts: Processing ${oauthAccount.provider} account`)
    
    if (!oauthAccount.access_token) {
      console.log(`⚠️ getConnectedAccounts: No access token for ${oauthAccount.provider}`)
      continue
    }

    const storageProvider = oauthAccount.provider === "google" ? "google_drive" : "dropbox"
    
    // Find corresponding storage account
    const storageAccount = storageAccounts.find(sa => 
      sa.provider === storageProvider && 
      sa.providerAccountId === oauthAccount.providerAccountId
    )
    
    console.log(`🔍 getConnectedAccounts: Storage account found for ${oauthAccount.provider}:`, !!storageAccount)
    if (storageAccount) {
      console.log(`🔍 getConnectedAccounts: Storage status: ${storageAccount.status}`)
    }

    const service = getStorageService(oauthAccount.provider === "google" ? "google_drive" : "dropbox")

    let email: string | undefined
    let name: string | undefined
    let hasValidOAuth = true

    if (service) {
      try {
        console.log(`🔍 getConnectedAccounts: Testing token for ${oauthAccount.provider}`)
        const tokenResult = await getValidAccessToken(userId, oauthAccount.provider as "google" | "dropbox")
        if (tokenResult) {
          console.log(`✅ getConnectedAccounts: Valid token for ${oauthAccount.provider}`)
          if (service.getAccountInfo) {
            try {
              const info = await service.getAccountInfo(tokenResult.accessToken)
              email = info.email
              name = info.name
              console.log(`✅ getConnectedAccounts: Got account info for ${oauthAccount.provider}`)
            } catch (infoError) {
              console.log(`⚠️ getConnectedAccounts: Failed to get account info for ${oauthAccount.provider}:`, infoError)
            }
          }
        } else {
          console.log(`❌ getConnectedAccounts: No valid token for ${oauthAccount.provider}`)
          hasValidOAuth = false
        }
      } catch (tokenError) {
        console.log(`❌ getConnectedAccounts: Token error for ${oauthAccount.provider}:`, tokenError)
        hasValidOAuth = false
      }
    } else {
      console.log(`❌ getConnectedAccounts: No service found for ${oauthAccount.provider}`)
    }

    // FIXED LOGIC: Separate OAuth status from storage status
    const storageIsActive = storageAccount?.status === "ACTIVE"
    const isConnected = hasValidOAuth && storageIsActive
    
    console.log(`🔍 getConnectedAccounts: Final status for ${oauthAccount.provider}:`, {
      hasValidOAuth,
      storageIsActive,
      isConnected
    })

    result.push({
      provider: oauthAccount.provider as "google" | "dropbox",
      providerAccountId: oauthAccount.providerAccountId,
      email: email || storageAccount?.email || undefined,
      name,
      isConnected, // Now properly reflects both OAuth AND storage status
      storageAccountId: storageAccount?.id,
      storageStatus: storageAccount?.status,
      isAuthAccount: true, // This OAuth account is used for login
      hasValidOAuth // NEW: Shows if OAuth itself is working
    })
  }

  console.log('🔍 getConnectedAccounts: Final result:', result.map(r => ({
    provider: r.provider,
    isConnected: r.isConnected,
    hasValidOAuth: r.hasValidOAuth,
    storageStatus: r.storageStatus
  })))

  return result
}

/**
 * Upload a file to cloud storage
 */
export async function uploadToCloudStorage(
  userId: string,
  provider: StorageProvider,
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string,
  folderPath?: string
): Promise<UploadResult> {
  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    return { success: false, error: `No valid ${provider} account connected` }
  }

  const service = getStorageService(provider)
  if (!service) {
    return { success: false, error: `Unknown storage provider: ${provider}` }
  }

  return service.uploadFile(
    tokenResult.accessToken,
    file,
    fileName,
    mimeType,
    folderId,
    folderPath
  )
}

/**
 * In-memory locks to prevent concurrent root folder creation for the same user/provider
 */
const creationLocks = new Map<string, Promise<StorageFolder | null>>()

/**
 * Get or create the root SecureUploadHub folder
 */
export async function getOrCreateRootFolder(
  userId: string,
  provider: StorageProvider
): Promise<StorageFolder | null> {
  const lockKey = `${userId}:${provider}`

  // If a creation is already in progress, wait for it
  if (creationLocks.has(lockKey)) {
    return creationLocks.get(lockKey)!
  }

  const creationPromise = (async () => {
    try {
      const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
      const tokenResult = await getValidAccessToken(userId, oauthProvider)

      if (!tokenResult) return null

      const service = getStorageService(provider)
      if (!service) return null

      const ROOT_NAME = "SecureUploadHub"

      // 1. Double check existence
      const folders = await service.listFolders(tokenResult.accessToken)
      const existing = folders.find(f => f.name.toLowerCase() === ROOT_NAME.toLowerCase())
      if (existing) return existing

      // 2. Attempt creation
      try {
        return await service.createFolder(tokenResult.accessToken, ROOT_NAME)
      } catch (createError: any) {
        // If creation failed but it might be because it was just created by another process, check again
        const refreshFolders = await service.listFolders(tokenResult.accessToken)
        const checkAgain = refreshFolders.find(f => f.name.toLowerCase() === ROOT_NAME.toLowerCase())
        if (checkAgain) return checkAgain

        throw createError
      }
    } catch (error) {
      console.error(`Failed to get/create root folder for ${provider}:`, error)
      return null
    } finally {
      // Clean up the lock after a short delay to ensure consistency
      setTimeout(() => creationLocks.delete(lockKey), 5000)
    }
  })()

  creationLocks.set(lockKey, creationPromise)
  return creationPromise
}

/**
 * List folders in cloud storage
 */
export async function listCloudFolders(
  userId: string,
  provider: StorageProvider,
  parentFolderId?: string
): Promise<StorageFolder[]> {
  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    return []
  }

  const service = getStorageService(provider)
  if (!service) {
    return []
  }

  // If no parentFolderId is provided, we default to the SecureUploadHub root
  let effectiveParentId = parentFolderId
  if (!effectiveParentId) {
    const root = await getOrCreateRootFolder(userId, provider)
    if (root) {
      effectiveParentId = root.id
    }
  }

  return service.listFolders(tokenResult.accessToken, effectiveParentId)
}

/**
 * Create a folder in cloud storage
 */
export async function createCloudFolder(
  userId: string,
  provider: StorageProvider,
  folderName: string,
  parentFolderId?: string
): Promise<StorageFolder | null> {
  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    return null
  }

  const service = getStorageService(provider)
  if (!service) {
    return null
  }

  try {
    return await service.createFolder(tokenResult.accessToken, folderName, parentFolderId)
  } catch (error) {
    console.error("Failed to create folder:", error)
    return null
  }
}

/**
 * Download a file from cloud storage
 */
export async function downloadFromCloudStorage(
  userId: string,
  provider: StorageProvider,
  fileId: string
): Promise<{ success?: boolean; error?: string; data?: ReadableStream | Buffer; mimeType?: string; fileName?: string } | null> {
  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    console.error(`No valid ${provider} token found for user ${userId}`)
    return null
  }

  const service = getStorageService(provider)
  if (!service) {
    return null
  }

  // Fallback: If fileId is missing or empty but we're on Google Drive, try to find it by name
  let effectiveFileId = fileId
  if ((!effectiveFileId || effectiveFileId === "") && provider === "google_drive") {
    // In this context, storagePath (fileId passed here) might be empty if it was invalid, 
    // but the API route passes storageId which we want to be reliable.
    // However, if we're here and fileId is empty, we might need more info.
    console.warn(`Attempting to find missing fileId for Google Drive...`)
  }

  try {
    if (service.downloadFile) {
      const result = await service.downloadFile(tokenResult.accessToken, fileId)
      return { success: true, data: result.data as Buffer, mimeType: result.mimeType, fileName: result.fileName }
    } else {
      return { success: false, error: "Download not supported for this provider" }
    }
  } catch (error) {
    console.error(`Failed to download from ${provider}:`, {
      error: error instanceof Error ? error.message : error,
      userId,
      fileId
    })
    return null
  }
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFromCloudStorage(
  userId: string,
  provider: StorageProvider,
  fileId: string
): Promise<void> {
  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    throw new Error(`No valid ${provider} account connected`)
  }

  const service = getStorageService(provider)
  if (!service) {
    throw new Error(`Unknown storage provider: ${provider}`)
  }

  if (!service.deleteFile) {
    throw new Error(`Delete not supported for this provider`)
  }

  const result = await service.deleteFile(tokenResult.accessToken, fileId)
  if (!result.success) {
    throw new Error(result.error || "Failed to delete file")
  }
}

/**
 * Validate storage connection by testing if we can get account info
 * Only marks as invalid if there are clear OAuth/authentication errors
 */
export async function validateStorageConnection(
  userId: string,
  provider: StorageProvider
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const tokenResult = await getValidAccessToken(userId, oauthProvider)

    if (!tokenResult) {
      return { isValid: false, error: "No valid token available" }
    }
    
    const service = getStorageService(provider)
    if (!service || !service.getAccountInfo) {
      // Don't mark as invalid if service is not available - this might be a temporary issue
      return { isValid: true }
    }

    // Test the connection by getting account info
    await service.getAccountInfo(tokenResult.accessToken)
    return { isValid: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Only mark as invalid if it's clearly an OAuth/authentication error
    if (errorMessage.includes('401') || 
        errorMessage.includes('unauthorized') || 
        errorMessage.includes('invalid_token') ||
        errorMessage.includes('token_expired') ||
        errorMessage.includes('access_denied')) {
      return { isValid: false, error: errorMessage }
    }
    
    // For other errors (network, temporary API issues, etc.), assume connection is still valid
    return { isValid: true }
  }
}

