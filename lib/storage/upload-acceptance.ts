/**
 * Upload Acceptance Enforcement
 * Implements portal upload acceptance rules based on storage account state
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"
import { getPortalUploadRules, PortalUploadRules } from "./portal-locking"

/**
 * Check if portal can accept uploads
 */
export async function checkPortalUploadAcceptance(
  portalId: string
): Promise<{
  accepted: boolean
  reason?: string
  storageAccountId?: string
  requiresUserAction?: boolean
  suggestedActions?: string[]
}> {
  // Get portal with storage account and user's other storage accounts
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: {
      storageAccount: {
        select: {
          id: true,
          status: true,
          provider: true,
          displayName: true
        }
      },
      user: {
        include: {
          storageAccounts: {
            where: {
              status: StorageAccountStatus.ACTIVE
            },
            select: {
              id: true,
              provider: true,
              status: true,
              displayName: true
            }
          }
        }
      }
    }
  })

  if (!portal) {
    return {
      accepted: false,
      reason: "Portal not found"
    }
  }

  if (!portal.isActive) {
    return {
      accepted: false,
      reason: "Portal is not active",
      requiresUserAction: true,
      suggestedActions: ["Activate portal in settings"]
    }
  }

  // Apply portal upload rules
  const uploadRules = getPortalUploadRules(
    portal.storageAccountId,
    portal.storageProvider,
    portal.storageAccount?.status as StorageAccountStatus || null,
    portal.user.storageAccounts
  )

  // Generate suggested actions based on the situation
  const suggestedActions = generateSuggestedActions(
    portal,
    uploadRules,
    portal.user.storageAccounts
  )

  return {
    accepted: uploadRules.acceptsUploads,
    reason: uploadRules.reason,
    storageAccountId: uploadRules.storageAccountId,
    requiresUserAction: uploadRules.requiresUserAction,
    suggestedActions
  }
}

/**
 * Generate suggested actions for upload issues
 */
function generateSuggestedActions(
  portal: any,
  uploadRules: PortalUploadRules,
  userActiveAccounts: any[]
): string[] {
  const actions: string[] = []

  if (!uploadRules.acceptsUploads) {
    // Portal has no storage account
    if (!portal.storageAccountId) {
      if (userActiveAccounts.length > 0) {
        actions.push("Configure portal storage account")
        actions.push("Select from available storage accounts")
      } else {
        actions.push(`Connect a ${portal.storageProvider} account`)
        actions.push("Set up cloud storage integration")
      }
    }
    // Portal has storage account but it's not active
    else if (portal.storageAccount) {
      const status = portal.storageAccount.status

      switch (status) {
        case StorageAccountStatus.INACTIVE:
          actions.push("Reactivate storage account")
          if (userActiveAccounts.length > 0) {
            actions.push("Switch to different storage account")
          }
          break

        case StorageAccountStatus.DISCONNECTED:
          actions.push("Reconnect storage account")
          actions.push("Re-authorize cloud storage access")
          if (userActiveAccounts.length > 0) {
            actions.push("Switch to different storage account")
          }
          break

        case StorageAccountStatus.ERROR:
          actions.push("Wait for automatic retry")
          actions.push("Check cloud storage connection")
          if (userActiveAccounts.length > 0) {
            actions.push("Switch to different storage account")
          }
          break
      }
    }
    // Portal references non-existent storage account
    else {
      actions.push("Fix portal storage configuration")
      if (userActiveAccounts.length > 0) {
        actions.push("Select valid storage account")
      } else {
        actions.push(`Connect a ${portal.storageProvider} account`)
      }
    }
  }

  return actions
}

/**
 * Pre-upload validation with detailed error information
 */
export async function validateUploadRequest(
  portalId: string,
  file: {
    name: string
    size: number
    type: string
  }
): Promise<{
  allowed: boolean
  error?: string
  errorCode?: string
  storageAccountId?: string
  requiresUserAction?: boolean
  suggestedActions?: string[]
}> {
  // Check portal upload acceptance
  const acceptance = await checkPortalUploadAcceptance(portalId)

  if (!acceptance.accepted) {
    return {
      allowed: false,
      error: acceptance.reason || "Upload not accepted",
      errorCode: getErrorCode(acceptance.reason),
      requiresUserAction: acceptance.requiresUserAction,
      suggestedActions: acceptance.suggestedActions
    }
  }

  // Additional file-specific validations would go here
  // (file size, type, etc. - existing logic from upload route)

  return {
    allowed: true,
    storageAccountId: acceptance.storageAccountId
  }
}

/**
 * Get error code for programmatic handling
 */
function getErrorCode(reason?: string): string {
  if (!reason) return "UNKNOWN_ERROR"

  const errorMappings: Record<string, string> = {
    "Portal not found": "PORTAL_NOT_FOUND",
    "Portal is not active": "PORTAL_INACTIVE",
    "Portal's storage account is inactive": "STORAGE_ACCOUNT_INACTIVE",
    "Portal's storage account is disconnected": "STORAGE_ACCOUNT_DISCONNECTED",
    "Portal's storage account has connection errors": "STORAGE_ACCOUNT_ERROR",
    "Portal's storage account not found": "STORAGE_ACCOUNT_NOT_FOUND",
    "No active": "NO_ACTIVE_STORAGE_ACCOUNT"
  }

  for (const [key, code] of Object.entries(errorMappings)) {
    if (reason.includes(key)) {
      return code
    }
  }

  return "UPLOAD_REJECTED"
}

/**
 * Get portal operational status for UI display
 */
export async function getPortalOperationalStatus(
  portalId: string
): Promise<{
  status: "operational" | "degraded" | "offline"
  message: string
  canAcceptUploads: boolean
  canAccessFiles: boolean
  lastUploadAt?: Date
  storageAccountStatus?: StorageAccountStatus
}> {
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    include: {
      storageAccount: {
        select: {
          status: true,
          lastAccessedAt: true,
          displayName: true
        }
      },
      uploads: {
        where: { status: "uploaded" },
        orderBy: { uploadedAt: "desc" },
        take: 1,
        select: { uploadedAt: true }
      }
    }
  })

  if (!portal) {
    return {
      status: "offline",
      message: "Portal not found",
      canAcceptUploads: false,
      canAccessFiles: false
    }
  }

  if (!portal.isActive) {
    return {
      status: "offline",
      message: "Portal is inactive",
      canAcceptUploads: false,
      canAccessFiles: false
    }
  }

  const storageAccountStatus = portal.storageAccount?.status as StorageAccountStatus
  const lastUploadAt = portal.uploads[0]?.uploadedAt || undefined

  // Determine status based on storage account state
  switch (storageAccountStatus) {
    case StorageAccountStatus.ACTIVE:
      return {
        status: "operational",
        message: "Fully operational",
        canAcceptUploads: true,
        canAccessFiles: true,
        lastUploadAt,
        storageAccountStatus
      }

    case StorageAccountStatus.INACTIVE:
      return {
        status: "degraded",
        message: "Storage account inactive - existing files accessible",
        canAcceptUploads: false,
        canAccessFiles: true,
        lastUploadAt,
        storageAccountStatus
      }

    case StorageAccountStatus.ERROR:
      return {
        status: "degraded",
        message: "Storage connection issues - may resolve automatically",
        canAcceptUploads: false,
        canAccessFiles: false,
        lastUploadAt,
        storageAccountStatus
      }

    case StorageAccountStatus.DISCONNECTED:
      return {
        status: "offline",
        message: "Storage account disconnected",
        canAcceptUploads: false,
        canAccessFiles: false,
        lastUploadAt,
        storageAccountStatus
      }

    default:
      // No storage account or unknown status
      return {
        status: "offline",
        message: "Storage not configured",
        canAcceptUploads: false,
        canAccessFiles: false,
        lastUploadAt
      }
  }
}

/**
 * Bulk check multiple portals' upload acceptance
 */
export async function checkMultiplePortalsUploadAcceptance(
  portalIds: string[]
): Promise<Record<string, {
  accepted: boolean
  reason?: string
  storageAccountStatus?: StorageAccountStatus
}>> {
  const portals = await prisma.uploadPortal.findMany({
    where: {
      id: { in: portalIds }
    },
    include: {
      storageAccount: {
        select: {
          status: true
        }
      }
    }
  })

  const results: Record<string, any> = {}

  for (const portal of portals) {
    if (!portal.isActive) {
      results[portal.id] = {
        accepted: false,
        reason: "Portal is not active"
      }
      continue
    }

    const storageAccountStatus = portal.storageAccount?.status as StorageAccountStatus

    if (!storageAccountStatus || storageAccountStatus !== StorageAccountStatus.ACTIVE) {
      results[portal.id] = {
        accepted: false,
        reason: `Storage account is ${storageAccountStatus?.toLowerCase() || "not configured"}`,
        storageAccountStatus
      }
    } else {
      results[portal.id] = {
        accepted: true,
        storageAccountStatus
      }
    }
  }

  return results
}