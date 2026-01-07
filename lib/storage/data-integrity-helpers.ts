/**
 * Data Integrity Helpers
 * Helper functions to work with the cleaned-up data model
 * These functions help derive storage provider from StorageAccount relationships
 * instead of using redundant storageProvider fields
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

/**
 * Get storage provider for a FileUpload
 * Uses storageAccount relationship as primary source, falls back to deprecated field
 */
export async function getFileUploadStorageProvider(fileUploadId: string): Promise<string | null> {
  const fileUpload = await prisma.fileUpload.findUnique({
    where: { id: fileUploadId },
    include: {
      storageAccount: {
        select: { provider: true }
      }
    }
  })

  if (!fileUpload) return null

  // Primary: Use storageAccount.provider
  if (fileUpload.storageAccount?.provider) {
    return fileUpload.storageAccount.provider
  }

  // Fallback: Use deprecated storageProvider field
  return fileUpload.storageProvider || null
}

/**
 * Get storage provider for an UploadPortal
 * Uses storageAccount relationship as primary source, falls back to deprecated field
 */
export async function getUploadPortalStorageProvider(portalId: string): Promise<string | null> {
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: {
      storageAccount: {
        select: { provider: true }
      }
    }
  })

  if (!portal) return null

  // Primary: Use storageAccount.provider
  if (portal.storageAccount?.provider) {
    return portal.storageAccount.provider
  }

  // Fallback: Use deprecated storageProvider field
  return portal.storageProvider || null
}

/**
 * Check if a StorageAccount is active
 * Uses status enum as primary source, falls back to deprecated isActive field
 */
export function isStorageAccountActive(storageAccount: {
  status: StorageAccountStatus
  isActive: boolean
}): boolean {
  // Primary: Use status enum
  return storageAccount.status === StorageAccountStatus.ACTIVE

  // Note: We don't need to check isActive as it should be synced with status
  // But if there's a discrepancy, status takes precedence
}

/**
 * Get active storage accounts for a user with proper provider information
 */
export async function getActiveStorageAccountsForUser(userId: string) {
  return await prisma.storageAccount.findMany({
    where: {
      userId,
      status: StorageAccountStatus.ACTIVE
    },
    select: {
      id: true,
      provider: true,
      displayName: true,
      email: true,
      status: true,
      lastAccessedAt: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * Get FileUploads with derived storage provider information
 * This replaces direct queries that used the deprecated storageProvider field
 */
export async function getFileUploadsWithProvider(filters: {
  portalId?: string
  userId?: string
  clientEmail?: string
  limit?: number
  offset?: number
}) {
  const { portalId, userId, clientEmail, limit = 50, offset = 0 } = filters

  return await prisma.fileUpload.findMany({
    where: {
      ...(portalId && { portalId }),
      ...(userId && { userId }),
      ...(clientEmail && { clientEmail })
    },
    include: {
      storageAccount: {
        select: {
          id: true,
          provider: true,
          status: true,
          displayName: true
        }
      },
      portal: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  })
}

/**
 * Get UploadPortals with derived storage provider information
 */
export async function getUploadPortalsWithProvider(userId: string) {
  return await prisma.uploadPortal.findMany({
    where: { userId },
    include: {
      storageAccount: {
        select: {
          id: true,
          provider: true,
          status: true,
          displayName: true
        }
      },
      _count: {
        select: {
          uploads: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * Update FileUpload to use proper StorageAccount binding
 * This helps migrate from storageProvider field to storageAccountId relationship
 */
export async function bindFileUploadToStorageAccount(
  fileUploadId: string,
  storageAccountId: string
): Promise<boolean> {
  try {
    await prisma.fileUpload.update({
      where: { id: fileUploadId },
      data: { storageAccountId }
    })
    return true
  } catch (error) {
    console.error('Failed to bind FileUpload to StorageAccount:', error)
    return false
  }
}

/**
 * Update UploadPortal to use proper StorageAccount binding
 */
export async function bindUploadPortalToStorageAccount(
  portalId: string,
  storageAccountId: string
): Promise<boolean> {
  try {
    await prisma.uploadPortal.update({
      where: { id: portalId },
      data: { storageAccountId }
    })
    return true
  } catch (error) {
    console.error('Failed to bind UploadPortal to StorageAccount:', error)
    return false
  }
}

/**
 * Sync isActive field with status enum for a StorageAccount
 * This ensures backward compatibility during the transition period
 */
export async function syncStorageAccountActiveStatus(storageAccountId: string): Promise<boolean> {
  try {
    const storageAccount = await prisma.storageAccount.findUnique({
      where: { id: storageAccountId },
      select: { status: true }
    })

    if (!storageAccount) return false

    const isActive = storageAccount.status === StorageAccountStatus.ACTIVE

    await prisma.storageAccount.update({
      where: { id: storageAccountId },
      data: { isActive }
    })

    return true
  } catch (error) {
    console.error('Failed to sync StorageAccount active status:', error)
    return false
  }
}

/**
 * Get storage provider from various sources with proper fallback
 * This is a utility function for code that needs to determine storage provider
 */
export function deriveStorageProvider(data: {
  storageAccount?: { provider: string } | null
  storageProvider?: string | null
}): string | null {
  // Primary: Use storageAccount.provider
  if (data.storageAccount?.provider) {
    return data.storageAccount.provider
  }

  // Fallback: Use deprecated storageProvider field
  return data.storageProvider || null
}

/**
 * Validate data integrity for FileUploads
 * Checks that cloud storage files have proper StorageAccount bindings
 */
export async function validateFileUploadIntegrity(fileUploadId: string): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
}> {
  const fileUpload = await prisma.fileUpload.findUnique({
    where: { id: fileUploadId },
    include: {
      storageAccount: true
    }
  })

  if (!fileUpload) {
    return {
      isValid: false,
      issues: ['FileUpload not found'],
      suggestions: []
    }
  }

  const issues: string[] = []
  const suggestions: string[] = []

  // Check if cloud storage file has StorageAccount binding
  const isCloudStorage = ['google_drive', 'dropbox'].includes(fileUpload.storageProvider)
  if (isCloudStorage && !fileUpload.storageAccountId) {
    issues.push('Cloud storage file missing StorageAccount binding')
    suggestions.push('Bind to appropriate StorageAccount using bindFileUploadToStorageAccount()')
  }

  // Check if StorageAccount exists and is accessible
  if (fileUpload.storageAccountId && !fileUpload.storageAccount) {
    issues.push('StorageAccount reference is broken')
    suggestions.push('Update storageAccountId to valid StorageAccount or set to null')
  }

  // Check for provider mismatch
  if (fileUpload.storageAccount && fileUpload.storageProvider !== fileUpload.storageAccount.provider) {
    issues.push(`Provider mismatch: storageProvider=${fileUpload.storageProvider}, storageAccount.provider=${fileUpload.storageAccount.provider}`)
    suggestions.push('Update storageProvider to match storageAccount.provider or remove deprecated field')
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

/**
 * Validate data integrity for UploadPortals
 */
export async function validateUploadPortalIntegrity(portalId: string): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
}> {
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: {
      storageAccount: true
    }
  })

  if (!portal) {
    return {
      isValid: false,
      issues: ['UploadPortal not found'],
      suggestions: []
    }
  }

  const issues: string[] = []
  const suggestions: string[] = []

  // Check if cloud storage portal has StorageAccount binding
  const isCloudStorage = ['google_drive', 'dropbox'].includes(portal.storageProvider)
  if (isCloudStorage && !portal.storageAccountId) {
    issues.push('Cloud storage portal missing StorageAccount binding')
    suggestions.push('Bind to appropriate StorageAccount using bindUploadPortalToStorageAccount()')
  }

  // Check if StorageAccount exists and is accessible
  if (portal.storageAccountId && !portal.storageAccount) {
    issues.push('StorageAccount reference is broken')
    suggestions.push('Update storageAccountId to valid StorageAccount or set to null')
  }

  // Check for provider mismatch
  if (portal.storageAccount && portal.storageProvider !== portal.storageAccount.provider) {
    issues.push(`Provider mismatch: storageProvider=${portal.storageProvider}, storageAccount.provider=${portal.storageAccount.provider}`)
    suggestions.push('Update storageProvider to match storageAccount.provider or remove deprecated field')
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}