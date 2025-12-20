// Cloud Storage Service - Main entry point

import prisma from "@/lib/prisma"
import { googleDriveService } from "./google-drive"
import { dropboxService } from "./dropbox"
import { CloudStorageService, StorageProvider, UploadResult, StorageFolder } from "./types"

export * from "./types"

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
      console.error(`Failed to refresh ${provider} token:`, error)
      return null
    }
  }

  return { accessToken: account.access_token, providerAccountId: account.providerAccountId }
}

/**
 * Get all connected storage accounts for a user
 */
export async function getConnectedAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
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

  const result: Array<{
    provider: "google" | "dropbox"
    providerAccountId: string
    email?: string
    name?: string
    isConnected: boolean
  }> = []

  for (const account of accounts) {
    if (!account.access_token) continue

    const storageProvider = account.provider === "google" ? "google_drive" : "dropbox"
    const service = getStorageService(storageProvider)
    
    let email: string | undefined
    let name: string | undefined
    let isConnected = true

    if (service) {
      try {
        const tokenResult = await getValidAccessToken(userId, account.provider as "google" | "dropbox")
        if (tokenResult) {
          const info = await service.getAccountInfo(tokenResult.accessToken)
          email = info.email
          name = info.name
        } else {
          isConnected = false
        }
      } catch {
        isConnected = false
      }
    }

    result.push({
      provider: account.provider as "google" | "dropbox",
      providerAccountId: account.providerAccountId,
      email,
      name,
      isConnected,
    })
  }

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
  if (provider === "local") {
    return { success: false, error: "Local storage should use file system directly" }
  }

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
 * List folders in cloud storage
 */
export async function listCloudFolders(
  userId: string,
  provider: StorageProvider,
  parentFolderId?: string
): Promise<StorageFolder[]> {
  if (provider === "local") {
    return []
  }

  const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
  const tokenResult = await getValidAccessToken(userId, oauthProvider)

  if (!tokenResult) {
    return []
  }

  const service = getStorageService(provider)
  if (!service) {
    return []
  }

  return service.listFolders(tokenResult.accessToken, parentFolderId)
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
  if (provider === "local") {
    return null
  }

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

