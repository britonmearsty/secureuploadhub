/**
 * Portal Creation Enforcement
 * Implements portal storage locking rules during creation
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"
import { validatePortalCreation, PortalCreationRules } from "./portal-locking"

/**
 * Validate portal creation with storage account requirements
 */
export async function validatePortalCreationWithStorage(
  userId: string,
  storageProvider: string,
  selectedStorageAccountId?: string
): Promise<{
  success: boolean
  storageAccountId?: string
  error?: string
}> {
  // Get user's storage accounts
  const userStorageAccounts = await prisma.storageAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      status: true,
      userId: true
    }
  })

  // Apply portal creation rules
  const creationRules = validatePortalCreation(
    userId,
    storageProvider,
    selectedStorageAccountId || null,
    userStorageAccounts
  )

  if (!creationRules.canCreate) {
    return {
      success: false,
      error: creationRules.reason || "Portal creation not allowed"
    }
  }

  return {
    success: true,
    storageAccountId: creationRules.requiredStorageAccountId
  }
}

/**
 * Create portal with proper storage account binding
 */
export async function createPortalWithStorageBinding(data: {
  userId: string
  name: string
  slug: string
  description?: string
  storageProvider: string
  storageAccountId: string
  storageFolderId?: string
  storageFolderPath?: string
  // ... other portal fields
  logoUrl?: string
  primaryColor?: string
  isActive?: boolean
  maxFileSize?: number
  allowedFileTypes?: string[]
  requireClientName?: boolean
  requireClientEmail?: boolean
  passwordHash?: string
  useClientFolders?: boolean
  backgroundColor?: string
  backgroundImageUrl?: string
  cardBackgroundColor?: string
  submitButtonText?: string
  successMessage?: string
  textColor?: string
  welcomeMessage?: string
}) {
  // Verify storage account belongs to user and is active
  const storageAccount = await prisma.storageAccount.findFirst({
    where: {
      id: data.storageAccountId,
      userId: data.userId,
      status: StorageAccountStatus.ACTIVE
    }
  })

  if (!storageAccount) {
    throw new Error("Invalid or inactive storage account")
  }

  // Verify provider consistency
  if (storageAccount.provider !== data.storageProvider) {
    throw new Error("Storage provider mismatch")
  }

  // Create portal with storage account binding
  const portal = await prisma.uploadPortal.create({
    data: {
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      storageProvider: data.storageProvider,
      storageAccountId: data.storageAccountId, // CRITICAL: Bind to storage account
      storageFolderId: data.storageFolderId,
      storageFolderPath: data.storageFolderPath,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor || "#4F46E5",
      isActive: data.isActive ?? true,
      maxFileSize: data.maxFileSize || 104857600,
      allowedFileTypes: data.allowedFileTypes || [],
      requireClientName: data.requireClientName ?? true,
      requireClientEmail: data.requireClientEmail ?? false,
      passwordHash: data.passwordHash,
      useClientFolders: data.useClientFolders ?? false,
      backgroundColor: data.backgroundColor,
      backgroundImageUrl: data.backgroundImageUrl,
      cardBackgroundColor: data.cardBackgroundColor || "#ffffff",
      submitButtonText: data.submitButtonText || "Initialize Transfer",
      successMessage: data.successMessage || "Transmission Verified",
      textColor: data.textColor || "#0f172a",
      welcomeMessage: data.welcomeMessage
    }
  })

  // Log portal creation with storage binding
  await logPortalStorageBinding(portal.id, data.storageAccountId, "PORTAL_CREATED")

  return portal
}

/**
 * Update portal storage account binding
 */
export async function updatePortalStorageAccount(
  portalId: string,
  userId: string,
  newStorageAccountId: string,
  reason: string = "USER_CHANGED"
): Promise<{
  success: boolean
  error?: string
}> {
  // Get current portal
  const portal = await prisma.uploadPortal.findFirst({
    where: {
      id: portalId,
      userId: userId
    },
    include: {
      storageAccount: true
    }
  })

  if (!portal) {
    return { success: false, error: "Portal not found" }
  }

  // Verify new storage account
  const newStorageAccount = await prisma.storageAccount.findFirst({
    where: {
      id: newStorageAccountId,
      userId: userId,
      status: StorageAccountStatus.ACTIVE
    }
  })

  if (!newStorageAccount) {
    return { success: false, error: "Invalid or inactive storage account" }
  }

  // Verify provider consistency
  if (newStorageAccount.provider !== portal.storageProvider) {
    return { success: false, error: "Storage provider mismatch" }
  }

  // Prevent no-op changes
  if (portal.storageAccountId === newStorageAccountId) {
    return { success: false, error: "Storage account is already selected" }
  }

  // Update portal binding
  const updatedPortal = await prisma.uploadPortal.update({
    where: { id: portalId },
    data: {
      storageAccountId: newStorageAccountId,
      updatedAt: new Date()
    }
  })

  // Log storage account change
  await logPortalStorageBinding(
    portalId,
    newStorageAccountId,
    "STORAGE_ACCOUNT_CHANGED",
    {
      oldStorageAccountId: portal.storageAccountId,
      reason
    }
  )

  return { success: true }
}

/**
 * Get portal upload acceptance status
 */
export async function getPortalUploadAcceptance(
  portalId: string
): Promise<{
  acceptsUploads: boolean
  reason?: string
  storageAccountId?: string
  requiresUserAction?: boolean
}> {
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: {
      storageAccount: {
        select: {
          id: true,
          status: true,
          provider: true
        }
      },
      user: {
        include: {
          storageAccounts: {
            where: {
              status: {
                not: StorageAccountStatus.DISCONNECTED
              }
            },
            select: {
              id: true,
              provider: true,
              status: true
            }
          }
        }
      }
    }
  })

  if (!portal) {
    return {
      acceptsUploads: false,
      reason: "Portal not found"
    }
  }

  if (!portal.isActive) {
    return {
      acceptsUploads: false,
      reason: "Portal is not active"
    }
  }

  // Import here to avoid circular dependency
  const { getPortalUploadRules } = await import("./portal-locking")

  const uploadRules = getPortalUploadRules(
    portal.storageAccountId,
    portal.storageProvider,
    portal.storageAccount?.status as StorageAccountStatus || null,
    portal.user.storageAccounts
  )

  return uploadRules
}

/**
 * Log portal storage binding events
 */
async function logPortalStorageBinding(
  portalId: string,
  storageAccountId: string,
  action: string,
  metadata?: any
) {
  try {
    // This would integrate with your audit logging system
    await prisma.auditLog.create({
      data: {
        userId: "", // Would need to get from context
        action,
        resource: "portal",
        resourceId: portalId,
        details: {
          storageAccountId,
          ...metadata
        }
      }
    })
  } catch (error) {
    console.error("Failed to log portal storage binding:", error)
    // Don't throw - logging failure shouldn't break portal operations
  }
}

/**
 * Validate portal storage configuration
 */
export async function validatePortalStorageConfig(
  portalId: string,
  userId: string
): Promise<{
  isValid: boolean
  issues: string[]
  canAcceptUploads: boolean
  canAccessFiles: boolean
}> {
  const portal = await prisma.uploadPortal.findFirst({
    where: {
      id: portalId,
      userId: userId
    },
    include: {
      storageAccount: true
    }
  })

  if (!portal) {
    return {
      isValid: false,
      issues: ["Portal not found"],
      canAcceptUploads: false,
      canAccessFiles: false
    }
  }

  const issues: string[] = []

  // Check storage account binding
  if (!portal.storageAccountId) {
    issues.push("Portal has no storage account binding")
  }

  // Check storage account exists
  if (portal.storageAccountId && !portal.storageAccount) {
    issues.push("Portal references non-existent storage account")
  }

  // Check provider consistency
  if (portal.storageAccount && portal.storageProvider !== portal.storageAccount.provider) {
    issues.push("Portal storage provider doesn't match storage account provider")
  }

  // Check storage account ownership
  if (portal.storageAccount && portal.storageAccount.userId !== userId) {
    issues.push("Portal's storage account doesn't belong to user")
  }

  // Determine capabilities
  const storageAccountStatus = portal.storageAccount?.status as StorageAccountStatus
  const canAcceptUploads = storageAccountStatus === StorageAccountStatus.ACTIVE
  const canAccessFiles = storageAccountStatus !== StorageAccountStatus.DISCONNECTED && 
                         storageAccountStatus !== StorageAccountStatus.ERROR

  return {
    isValid: issues.length === 0,
    issues,
    canAcceptUploads,
    canAccessFiles
  }
}