/**
 * File Binding Rules
 * Defines how files are permanently bound to storage accounts
 */

import { StorageAccountStatus, canCreateUploads, canAccessFiles } from "./account-states"

/**
 * File Binding Rules - IMMUTABLE ONCE SET
 */
export const FILE_BINDING_RULES = {
  /**
   * CRITICAL: Files are permanently bound to their storage account
   * This binding CANNOT be changed once established
   */
  PERMANENT_BINDING: {
    // File's storageAccountId is set once during upload and never changes
    isImmutable: true,
    // Files cannot be migrated between storage accounts
    noMigration: true,
    // Binding survives all storage account state changes
    survivesStateChanges: true,
    // Files remember their storage even if account is DISCONNECTED
    preservedOnDisconnect: true
  },

  /**
   * Binding Assignment Rules
   */
  ASSIGNMENT: {
    // Files inherit storage account from their portal at upload time
    inheritFromPortal: true,
    // If portal has no storage account, use user's active account for that provider
    fallbackToUserActiveAccount: true,
    // Binding is set immediately when FileUpload record is created
    setOnCreation: true,
    // No binding = upload fails (no orphaned files)
    requiresBinding: true
  },

  /**
   * Access Control Rules
   */
  ACCESS_CONTROL: {
    // File access is controlled by storage account state
    dependsOnAccountState: true,
    // Files with DISCONNECTED accounts cannot be accessed
    blockedOnDisconnected: true,
    // Files with ERROR accounts cannot be accessed
    blockedOnError: true,
    // Files with INACTIVE accounts can still be accessed
    allowedOnInactive: true
  }
} as const

/**
 * Upload Flow Rules
 */
export interface UploadFlowRules {
  canUpload: boolean
  reason?: string
  storageAccountId?: string
}

/**
 * Determine upload eligibility and storage account binding
 */
export function getUploadRules(
  portalStorageAccountId: string | null,
  portalStorageProvider: string,
  userStorageAccounts: Array<{
    id: string
    provider: string
    status: StorageAccountStatus
  }>
): UploadFlowRules {
  // Rule 1: If portal has a storage account, use it (if ACTIVE)
  if (portalStorageAccountId) {
    const portalAccount = userStorageAccounts.find(acc => acc.id === portalStorageAccountId)
    
    if (!portalAccount) {
      return {
        canUpload: false,
        reason: "Portal's storage account not found"
      }
    }

    if (!canCreateUploads(portalAccount.status)) {
      return {
        canUpload: false,
        reason: `Portal's storage account is ${portalAccount.status.toLowerCase()}`
      }
    }

    return {
      canUpload: true,
      storageAccountId: portalStorageAccountId
    }
  }

  // Rule 2: Portal has no storage account, find active account for provider
  const preferredAccount = userStorageAccounts.find(acc => 
    acc.provider === portalStorageProvider && 
    canCreateUploads(acc.status)
  )

  if (preferredAccount) {
    return {
      canUpload: true,
      storageAccountId: preferredAccount.id
    }
  }

  // Rule 3: Fallback - if preferred provider not available, use any active account
  const anyActiveAccount = userStorageAccounts.find(acc => 
    canCreateUploads(acc.status)
  )

  if (anyActiveAccount) {
    return {
      canUpload: true,
      storageAccountId: anyActiveAccount.id
    }
  }

  // Rule 4: No active accounts available
  return {
    canUpload: false,
    reason: `No active storage accounts available. Please connect a cloud storage provider.`
  }
}

/**
 * Download Flow Rules
 */
export interface DownloadFlowRules {
  canDownload: boolean
  reason?: string
  requiresAuth: boolean
}

/**
 * Determine download eligibility based on file's storage account state
 */
export function getDownloadRules(
  fileStorageAccountId: string | null,
  storageAccountStatus: StorageAccountStatus | null
): DownloadFlowRules {
  // Rule 1: Files without storage account binding (legacy files)
  if (!fileStorageAccountId || !storageAccountStatus) {
    return {
      canDownload: true,
      requiresAuth: false,
      reason: "Legacy file without storage account binding"
    }
  }

  // Rule 2: Check storage account state
  if (!canAccessFiles(storageAccountStatus)) {
    return {
      canDownload: false,
      requiresAuth: true,
      reason: `Storage account is ${storageAccountStatus.toLowerCase()}`
    }
  }

  return {
    canDownload: true,
    requiresAuth: true
  }
}

/**
 * Upload Flow Implementation
 */
export const UPLOAD_FLOW = {
  /**
   * Step 1: Validate portal and determine storage account
   */
  VALIDATION: {
    // Portal must exist and be active
    requireActivePortal: true,
    // Portal must have valid storage configuration
    requireStorageConfig: true,
    // User must have appropriate storage account
    requireStorageAccount: true
  },

  /**
   * Step 2: Storage account binding
   */
  BINDING: {
    // Determine storage account using getUploadRules()
    resolveStorageAccount: true,
    // Fail upload if no valid storage account found
    failOnNoAccount: true,
    // Set storageAccountId in FileUpload record immediately
    setOnFileUploadCreation: true
  },

  /**
   * Step 3: Cloud storage upload
   */
  CLOUD_UPLOAD: {
    // Use storage account's OAuth tokens
    useAccountTokens: true,
    // Upload to storage account's provider
    useAccountProvider: true,
    // Store cloud file ID in FileUpload record
    storeCloudFileId: true
  },

  /**
   * Step 4: Finalization
   */
  FINALIZATION: {
    // Mark upload as successful
    setStatusUploaded: true,
    // Update lastAccessedAt on storage account
    updateAccountAccess: true,
    // Binding is now permanent and immutable
    bindingImmutable: true
  }
} as const

/**
 * Download Flow Implementation
 */
export const DOWNLOAD_FLOW = {
  /**
   * Step 1: File validation
   */
  VALIDATION: {
    // File must exist in database
    requireFileExists: true,
    // File must have been successfully uploaded
    requireUploadedStatus: true
  },

  /**
   * Step 2: Storage account validation
   */
  STORAGE_VALIDATION: {
    // Check file's storage account state using getDownloadRules()
    checkStorageAccountState: true,
    // Block download if account is DISCONNECTED or ERROR
    blockOnInvalidState: true,
    // Allow download for INACTIVE accounts (existing data accessible)
    allowInactiveAccess: true
  },

  /**
   * Step 3: Cloud storage access
   */
  CLOUD_ACCESS: {
    // Use file's bound storage account tokens
    useBoundAccountTokens: true,
    // Access file from original storage location
    useOriginalLocation: true,
    // Update lastAccessedAt on storage account
    updateAccountAccess: true
  },

  /**
   * Step 4: Error handling
   */
  ERROR_HANDLING: {
    // If OAuth tokens invalid, mark account as ERROR
    markAccountOnTokenError: true,
    // If file not found in cloud, preserve database record
    preserveRecordOnCloudError: true,
    // Return appropriate error to user
    returnUserFriendlyError: true
  }
} as const

/**
 * Binding Validation Functions
 */
export function validateFileBinding(
  fileId: string,
  storageAccountId: string | null,
  portalStorageAccountId: string | null
): { isValid: boolean; reason?: string } {
  if (!storageAccountId) {
    return {
      isValid: false,
      reason: "File has no storage account binding"
    }
  }

  // Files should be bound to their portal's storage account at upload time
  if (portalStorageAccountId && storageAccountId !== portalStorageAccountId) {
    // This is allowed - portal may have changed storage account after upload
    // File keeps its original binding (permanent)
    return {
      isValid: true,
      reason: "File bound to different storage account than current portal (expected)"
    }
  }

  return { isValid: true }
}

/**
 * Legacy File Handling
 */
export const LEGACY_FILE_RULES = {
  // Files uploaded before storage account system
  WITHOUT_BINDING: {
    // Allow access to legacy files
    allowAccess: true,
    // Don't require storage account validation
    skipAccountValidation: true,
    // Use portal's current storage provider for access
    usePortalProvider: true
  },

  // Gradual migration approach
  MIGRATION_STRATEGY: {
    // Don't auto-migrate existing files
    noAutoMigration: true,
    // Bind new uploads properly
    bindNewUploads: true,
    // Preserve legacy file access
    preserveLegacyAccess: true
  }
} as const