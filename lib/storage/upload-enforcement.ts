/**
 * Upload Flow Enforcement
 * Implements file binding rules during upload process
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"
import { getUploadRules, UploadFlowRules } from "./file-binding"

/**
 * Validate and determine storage account for upload
 */
export async function validateUploadAndGetStorageAccount(
  portalId: string,
  userId: string
): Promise<{
  success: boolean
  storageAccountId?: string
  error?: string
}> {
  // Get portal with storage configuration
  const portal = await prisma.uploadPortal.findUnique({
    where: { id: portalId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      storageProvider: true,
      storageAccountId: true
    }
  })

  if (!portal) {
    return { success: false, error: "Portal not found" }
  }

  if (!portal.isActive) {
    return { success: false, error: "Portal is not active" }
  }

  if (portal.userId !== userId) {
    return { success: false, error: "Portal does not belong to user" }
  }

  // Get user's storage accounts for this provider
  const userStorageAccounts = await prisma.storageAccount.findMany({
    where: {
      userId: userId,
      provider: portal.storageProvider
    },
    select: {
      id: true,
      provider: true,
      status: true
    }
  })

  // Apply upload rules to determine storage account
  const uploadRules = getUploadRules(
    portal.storageAccountId,
    portal.storageProvider,
    userStorageAccounts
  )

  if (!uploadRules.canUpload) {
    return {
      success: false,
      error: uploadRules.reason || "Upload not allowed"
    }
  }

  return {
    success: true,
    storageAccountId: uploadRules.storageAccountId
  }
}

/**
 * Create FileUpload record with proper storage account binding
 */
export async function createFileUploadWithBinding(data: {
  portalId: string
  fileName: string
  fileSize: number
  mimeType: string
  clientName?: string | null
  clientEmail?: string | null
  clientMessage?: string | null
  storageProvider: string
  storageAccountId: string
  storageFileId?: string | null
  storagePath?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}) {
  // CRITICAL: Set storageAccountId immediately and permanently
  const fileUpload = await prisma.fileUpload.create({
    data: {
      portalId: data.portalId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientMessage: data.clientMessage,
      storageProvider: data.storageProvider,
      storageAccountId: data.storageAccountId, // PERMANENT BINDING
      storageFileId: data.storageFileId,
      storagePath: data.storagePath,
      status: "pending",
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      uploadedAt: null // Set when upload completes
    }
  })

  return fileUpload
}

/**
 * Complete upload and finalize binding
 */
export async function finalizeUploadBinding(
  fileUploadId: string,
  storageFileId: string,
  storagePath?: string
) {
  const now = new Date()

  // Update file upload record
  const fileUpload = await prisma.fileUpload.update({
    where: { id: fileUploadId },
    data: {
      storageFileId,
      storagePath,
      status: "uploaded",
      uploadedAt: now
    },
    include: {
      storageAccount: true
    }
  })

  // Update storage account last accessed time
  if (fileUpload.storageAccountId) {
    await prisma.storageAccount.update({
      where: { id: fileUpload.storageAccountId },
      data: { lastAccessedAt: now }
    })
  }

  return fileUpload
}

/**
 * Handle upload failure - preserve binding for retry
 */
export async function handleUploadFailure(
  fileUploadId: string,
  errorMessage: string
) {
  // Mark as failed but preserve storage account binding
  await prisma.fileUpload.update({
    where: { id: fileUploadId },
    data: {
      status: "failed",
      errorMessage
    }
    // NOTE: storageAccountId is preserved for potential retry
  })
}

/**
 * Validate existing file binding integrity
 */
export async function validateFileBindingIntegrity(fileUploadId: string): Promise<{
  isValid: boolean
  issues: string[]
}> {
  const file = await prisma.fileUpload.findUnique({
    where: { id: fileUploadId },
    include: {
      portal: true,
      storageAccount: true
    }
  })

  if (!file) {
    return { isValid: false, issues: ["File not found"] }
  }

  const issues: string[] = []

  // Check if file has storage account binding
  if (!file.storageAccountId) {
    issues.push("File has no storage account binding (legacy file)")
  }

  // Check if storage account exists
  if (file.storageAccountId && !file.storageAccount) {
    issues.push("File references non-existent storage account")
  }

  // Check provider consistency
  if (file.storageAccount && file.storageProvider !== file.storageAccount.provider) {
    issues.push("File storage provider doesn't match storage account provider")
  }

  // Check if storage account belongs to portal owner
  if (file.storageAccount && file.portal && file.storageAccount.userId !== file.portal.userId) {
    issues.push("File's storage account doesn't belong to portal owner")
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}