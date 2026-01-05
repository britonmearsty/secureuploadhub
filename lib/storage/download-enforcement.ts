/**
 * Download Flow Enforcement
 * Implements file binding rules during download process
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"
import { getDownloadRules, DownloadFlowRules, LEGACY_FILE_RULES } from "./file-binding"
import { getValidAccessToken } from "./index"

/**
 * Validate file download eligibility
 */
export async function validateFileDownload(
  fileUploadId: string,
  userId: string
): Promise<{
  success: boolean
  file?: any
  storageAccount?: any
  error?: string
  requiresAuth?: boolean
}> {
  // Get file with storage account and portal information
  const file = await prisma.fileUpload.findUnique({
    where: { id: fileUploadId },
    include: {
      portal: {
        select: {
          userId: true,
          storageProvider: true
        }
      },
      storageAccount: {
        select: {
          id: true,
          provider: true,
          status: true,
          providerAccountId: true
        }
      }
    }
  })

  if (!file) {
    return { success: false, error: "File not found" }
  }

  // Verify file belongs to user's portal
  if (file.portal.userId !== userId) {
    return { success: false, error: "File does not belong to user" }
  }

  // Check if file was successfully uploaded
  if (file.status !== "uploaded") {
    return { 
      success: false, 
      error: `File is in ${file.status} state and cannot be downloaded` 
    }
  }

  // Handle legacy files without storage account binding
  if (!file.storageAccountId || !file.storageAccount) {
    if (LEGACY_FILE_RULES.WITHOUT_BINDING.allowAccess) {
      return {
        success: true,
        file,
        storageAccount: null,
        requiresAuth: false
      }
    } else {
      return {
        success: false,
        error: "Legacy file without storage account binding"
      }
    }
  }

  // Apply download rules based on storage account state
  const downloadRules = getDownloadRules(
    file.storageAccountId,
    file.storageAccount.status as StorageAccountStatus
  )

  if (!downloadRules.canDownload) {
    return {
      success: false,
      error: downloadRules.reason || "Download not allowed",
      requiresAuth: downloadRules.requiresAuth
    }
  }

  return {
    success: true,
    file,
    storageAccount: file.storageAccount,
    requiresAuth: downloadRules.requiresAuth
  }
}

/**
 * Get download access token for file's storage account
 */
export async function getFileDownloadToken(
  file: any,
  storageAccount: any,
  userId: string
): Promise<{
  success: boolean
  accessToken?: string
  providerAccountId?: string
  error?: string
}> {
  // Handle legacy files
  if (!storageAccount) {
    // Use any available account for the provider
    const provider = file.storageProvider === "google_drive" ? "google" : "dropbox"
    const tokenResult = await getValidAccessToken(userId, provider)
    
    if (!tokenResult) {
      return {
        success: false,
        error: `No valid ${provider} account found for legacy file access`
      }
    }

    return {
      success: true,
      accessToken: tokenResult.accessToken,
      providerAccountId: tokenResult.providerAccountId
    }
  }

  // Use file's bound storage account
  const provider = storageAccount.provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, provider)

  if (!tokenResult) {
    // Mark storage account as having connection issues
    await markStorageAccountError(
      storageAccount.id,
      "OAuth token invalid or expired"
    )

    return {
      success: false,
      error: "Storage account connection error"
    }
  }

  // Verify token belongs to the correct account
  if (tokenResult.providerAccountId !== storageAccount.providerAccountId) {
    return {
      success: false,
      error: "Token does not match file's storage account"
    }
  }

  return {
    success: true,
    accessToken: tokenResult.accessToken,
    providerAccountId: tokenResult.providerAccountId
  }
}

/**
 * Update storage account access time after successful download
 */
export async function updateStorageAccountAccess(storageAccountId: string) {
  if (!storageAccountId) return

  await prisma.storageAccount.update({
    where: { id: storageAccountId },
    data: { lastAccessedAt: new Date() }
  })
}

/**
 * Mark storage account as having errors
 */
export async function markStorageAccountError(
  storageAccountId: string,
  errorMessage: string
) {
  await prisma.storageAccount.update({
    where: { id: storageAccountId },
    data: {
      status: StorageAccountStatus.ERROR,
      lastError: errorMessage,
      updatedAt: new Date()
    }
  })
}

/**
 * Handle download errors and update storage account state
 */
export async function handleDownloadError(
  fileUploadId: string,
  storageAccountId: string | null,
  error: any
): Promise<void> {
  // Log the error (implementation depends on logging system)
  console.error(`Download error for file ${fileUploadId}:`, error)

  // Update storage account state if error is OAuth-related
  if (storageAccountId && isOAuthError(error)) {
    await markStorageAccountError(
      storageAccountId,
      "OAuth authentication failed during download"
    )
  }
}

/**
 * Check if error is OAuth-related
 */
function isOAuthError(error: any): boolean {
  const oauthErrorCodes = [401, 403]
  const oauthErrorMessages = [
    "invalid_token",
    "token_expired",
    "insufficient_scope",
    "unauthorized"
  ]

  if (typeof error === "object" && error !== null) {
    // Check status code
    if (oauthErrorCodes.includes(error.status || error.statusCode)) {
      return true
    }

    // Check error message
    const errorMessage = (error.message || error.error || "").toLowerCase()
    return oauthErrorMessages.some(msg => errorMessage.includes(msg))
  }

  return false
}

/**
 * Get file download statistics
 */
export async function getFileDownloadStats(fileUploadId: string): Promise<{
  totalDownloads: number
  lastDownloadAt: Date | null
  storageAccountStatus: StorageAccountStatus | null
}> {
  const file = await prisma.fileUpload.findUnique({
    where: { id: fileUploadId },
    include: {
      storageAccount: {
        select: {
          status: true,
          lastAccessedAt: true
        }
      }
    }
  })

  if (!file) {
    return {
      totalDownloads: 0,
      lastDownloadAt: null,
      storageAccountStatus: null
    }
  }

  return {
    totalDownloads: 0, // Would need separate download tracking table
    lastDownloadAt: file.storageAccount?.lastAccessedAt || null,
    storageAccountStatus: file.storageAccount?.status as StorageAccountStatus || null
  }
}