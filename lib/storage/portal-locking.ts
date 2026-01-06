/**
 * Portal Storage Locking Rules
 * Defines how portals bind to storage accounts and behavior when disconnected
 */

import { StorageAccountStatus, canCreateUploads } from "./account-states"

/**
 * Portal Storage Binding Rules
 */
export const PORTAL_BINDING_RULES = {
  /**
   * Portal Creation Rules
   */
  CREATION: {
    // Portal must be bound to a storage account at creation
    requiresStorageAccount: true,
    // Only ACTIVE storage accounts can be selected for new portals
    requiresActiveAccount: true,
    // Portal inherits storage provider from selected storage account
    inheritProviderFromAccount: true,
    // Portal binding is set once and persists
    bindingIsPersistent: true
  },

  /**
   * Portal Binding Persistence
   */
  PERSISTENCE: {
    // Portal keeps its storage account binding even if account becomes INACTIVE
    survivesInactiveState: true,
    // Portal keeps its storage account binding even if account becomes DISCONNECTED
    survivesDisconnectedState: true,
    // Portal keeps its storage account binding even if account has ERROR
    survivesErrorState: true,
    // Portal binding is never automatically changed by system
    noAutoSwitching: true
  },

  /**
   * Manual Binding Changes
   */
  MANUAL_CHANGES: {
    // Users can manually change portal's storage account
    allowManualChange: true,
    // Can only change to ACTIVE storage accounts
    requireActiveTargetAccount: true,
    // Change affects future uploads only, not existing files
    affectsFutureUploadsOnly: true,
    // Existing files keep their original storage account binding
    preservesExistingFileBindings: true
  }
} as const

/**
 * Portal Upload Acceptance Rules
 */
export interface PortalUploadRules {
  acceptsUploads: boolean
  reason?: string
  storageAccountId?: string
  requiresUserAction?: boolean
}

/**
 * Determine if portal can accept uploads based on storage account state
 */
export function getPortalUploadRules(
  portalStorageAccountId: string | null,
  portalStorageProvider: string,
  storageAccountStatus: StorageAccountStatus | null,
  userActiveStorageAccounts: Array<{
    id: string
    provider: string
    status: StorageAccountStatus
  }>
): PortalUploadRules {
  // Rule 1: Portal has no storage account binding (legacy portal)
  if (!portalStorageAccountId) {
    // Find any active account for the portal's provider
    const activeAccount = userActiveStorageAccounts.find(acc => 
      acc.provider === portalStorageProvider && 
      canCreateUploads(acc.status)
    )

    if (!activeAccount) {
      return {
        acceptsUploads: false,
        reason: `No active ${portalStorageProvider} storage account available`,
        requiresUserAction: true
      }
    }

    return {
      acceptsUploads: true,
      storageAccountId: activeAccount.id,
      reason: "Using available active storage account"
    }
  }

  // Rule 2: Portal has storage account binding
  if (!storageAccountStatus) {
    return {
      acceptsUploads: false,
      reason: "Portal's storage account not found",
      requiresUserAction: true
    }
  }

  // Rule 3: Check storage account state
  switch (storageAccountStatus) {
    case StorageAccountStatus.ACTIVE:
      return {
        acceptsUploads: true,
        storageAccountId: portalStorageAccountId
      }

    case StorageAccountStatus.INACTIVE:
      return {
        acceptsUploads: false,
        reason: "Portal's storage account is inactive",
        requiresUserAction: true
      }

    case StorageAccountStatus.DISCONNECTED:
      return {
        acceptsUploads: false,
        reason: "Portal's storage account is disconnected",
        requiresUserAction: true
      }

    case StorageAccountStatus.ERROR:
      return {
        acceptsUploads: false,
        reason: "Portal's storage account has connection errors",
        requiresUserAction: false // May resolve automatically
      }

    default:
      return {
        acceptsUploads: false,
        reason: "Portal's storage account has unknown status",
        requiresUserAction: true
      }
  }
}

/**
 * Portal Creation Validation Rules
 */
export interface PortalCreationRules {
  canCreate: boolean
  reason?: string
  requiredStorageAccountId?: string
}

/**
 * Validate portal creation requirements
 */
export function validatePortalCreation(
  userId: string,
  storageProvider: string,
  selectedStorageAccountId: string | null,
  userStorageAccounts: Array<{
    id: string
    provider: string
    status: StorageAccountStatus
    userId: string
  }>
): PortalCreationRules {
  // Rule 1: Must have at least one storage account for the provider
  const providerAccounts = userStorageAccounts.filter(acc => 
    acc.provider === storageProvider && acc.userId === userId
  )

  if (providerAccounts.length === 0) {
    // Check if user has any storage accounts at all
    const anyStorageAccounts = userStorageAccounts.filter(acc => acc.userId === userId)
    
    if (anyStorageAccounts.length === 0) {
      // No storage accounts at all - user needs to connect one
      return {
        canCreate: false,
        reason: `No storage accounts connected. Please connect a ${storageProvider === "google_drive" ? "Google Drive" : "Dropbox"} account first.`
      }
    } else {
      // User has storage accounts but not for this provider
      const availableProviders = [...new Set(anyStorageAccounts.map(acc => acc.provider))]
      const friendlyProviders = availableProviders.map(p => p === "google_drive" ? "Google Drive" : "Dropbox").join(", ")
      
      return {
        canCreate: false,
        reason: `No ${storageProvider === "google_drive" ? "Google Drive" : "Dropbox"} account connected. You have: ${friendlyProviders}. Please connect a ${storageProvider === "google_drive" ? "Google Drive" : "Dropbox"} account or select a different storage provider.`
      }
    }
  }

  // Rule 2: Must have at least one ACTIVE account for the provider
  const activeAccounts = providerAccounts.filter(acc => 
    canCreateUploads(acc.status)
  )

  if (activeAccounts.length === 0) {
    return {
      canCreate: false,
      reason: `No active ${storageProvider} storage account available`
    }
  }

  // Rule 3: If storage account is specified, validate it
  if (selectedStorageAccountId) {
    const selectedAccount = providerAccounts.find(acc => 
      acc.id === selectedStorageAccountId
    )

    if (!selectedAccount) {
      return {
        canCreate: false,
        reason: "Selected storage account not found"
      }
    }

    if (!canCreateUploads(selectedAccount.status)) {
      return {
        canCreate: false,
        reason: `Selected storage account is ${selectedAccount.status.toLowerCase()}`
      }
    }

    return {
      canCreate: true,
      requiredStorageAccountId: selectedStorageAccountId
    }
  }

  // Rule 4: Auto-select first active account
  return {
    canCreate: true,
    requiredStorageAccountId: activeAccounts[0].id
  }
}

/**
 * Portal Disconnection Behavior Rules
 */
export const DISCONNECTION_BEHAVIOR = {
  /**
   * When storage account becomes DISCONNECTED
   */
  ON_DISCONNECTED: {
    // Portal remains visible and accessible
    portalStaysVisible: true,
    // Portal shows disconnected status
    showDisconnectedStatus: true,
    // Portal rejects new uploads
    rejectNewUploads: true,
    // Existing files become inaccessible
    blockExistingFileAccess: true,
    // Portal settings remain editable
    allowSettingsEdit: true,
    // User can change to different storage account
    allowStorageAccountChange: true
  },

  /**
   * When storage account becomes INACTIVE
   */
  ON_INACTIVE: {
    // Portal remains visible and accessible
    portalStaysVisible: true,
    // Portal shows inactive status
    showInactiveStatus: true,
    // Portal rejects new uploads
    rejectNewUploads: true,
    // Existing files remain accessible
    allowExistingFileAccess: true,
    // Portal settings remain editable
    allowSettingsEdit: true,
    // User can reactivate storage account or change to different one
    allowStorageAccountChange: true
  },

  /**
   * When storage account has ERROR
   */
  ON_ERROR: {
    // Portal remains visible and accessible
    portalStaysVisible: true,
    // Portal shows error status
    showErrorStatus: true,
    // Portal rejects new uploads
    rejectNewUploads: true,
    // Existing files become temporarily inaccessible
    blockExistingFileAccess: true,
    // Portal settings remain editable
    allowSettingsEdit: true,
    // User can retry connection or change storage account
    allowStorageAccountChange: true,
    // System may auto-retry connection
    allowAutoRetry: true
  }
} as const

/**
 * Portal Status Determination
 */
export interface PortalStatus {
  isOperational: boolean
  statusMessage: string
  canAcceptUploads: boolean
  canAccessFiles: boolean
  requiresUserAction: boolean
  suggestedActions: string[]
}

/**
 * Determine portal operational status
 */
export function getPortalStatus(
  portalStorageAccountId: string | null,
  storageAccountStatus: StorageAccountStatus | null,
  storageProvider: string,
  hasAlternativeAccounts: boolean
): PortalStatus {
  // No storage account binding (legacy portal)
  if (!portalStorageAccountId) {
    return {
      isOperational: hasAlternativeAccounts,
      statusMessage: hasAlternativeAccounts 
        ? "Using available storage account"
        : "No storage account configured",
      canAcceptUploads: hasAlternativeAccounts,
      canAccessFiles: true, // Legacy files may still be accessible
      requiresUserAction: !hasAlternativeAccounts,
      suggestedActions: hasAlternativeAccounts 
        ? ["Configure preferred storage account"]
        : ["Connect a storage account", "Configure portal storage"]
    }
  }

  // Storage account not found
  if (!storageAccountStatus) {
    return {
      isOperational: false,
      statusMessage: "Storage account not found",
      canAcceptUploads: false,
      canAccessFiles: false,
      requiresUserAction: true,
      suggestedActions: ["Reconnect storage account", "Select different storage account"]
    }
  }

  // Based on storage account status
  switch (storageAccountStatus) {
    case StorageAccountStatus.ACTIVE:
      return {
        isOperational: true,
        statusMessage: "Fully operational",
        canAcceptUploads: true,
        canAccessFiles: true,
        requiresUserAction: false,
        suggestedActions: []
      }

    case StorageAccountStatus.INACTIVE:
      return {
        isOperational: false,
        statusMessage: "Storage account is inactive",
        canAcceptUploads: false,
        canAccessFiles: true,
        requiresUserAction: true,
        suggestedActions: [
          "Reactivate storage account",
          "Select different storage account"
        ]
      }

    case StorageAccountStatus.DISCONNECTED:
      return {
        isOperational: false,
        statusMessage: "Storage account is disconnected",
        canAcceptUploads: false,
        canAccessFiles: false,
        requiresUserAction: true,
        suggestedActions: [
          "Reconnect storage account",
          "Select different storage account"
        ]
      }

    case StorageAccountStatus.ERROR:
      return {
        isOperational: false,
        statusMessage: "Storage account has connection errors",
        canAcceptUploads: false,
        canAccessFiles: false,
        requiresUserAction: false, // May resolve automatically
        suggestedActions: [
          "Wait for automatic retry",
          "Reconnect storage account",
          "Select different storage account"
        ]
      }

    default:
      return {
        isOperational: false,
        statusMessage: "Unknown storage account status",
        canAcceptUploads: false,
        canAccessFiles: false,
        requiresUserAction: true,
        suggestedActions: ["Contact support"]
      }
  }
}

/**
 * Portal Storage Account Change Rules
 */
export const STORAGE_CHANGE_RULES = {
  /**
   * Validation Rules
   */
  VALIDATION: {
    // Can only change to user's own storage accounts
    mustOwnTargetAccount: true,
    // Can only change to ACTIVE storage accounts
    requireActiveTargetAccount: true,
    // Must be same provider as portal's current provider
    mustMatchProvider: true,
    // Cannot change to same account (no-op)
    preventSameAccountChange: true
  },

  /**
   * Impact Rules
   */
  IMPACT: {
    // Change affects future uploads only
    affectsFutureUploadsOnly: true,
    // Existing files keep their original storage account binding
    preserveExistingFileBindings: true,
    // Portal immediately becomes operational if target account is ACTIVE
    immediateOperationalStatus: true,
    // No data migration occurs
    noDataMigration: true
  },

  /**
   * Audit Rules
   */
  AUDIT: {
    // Log storage account changes
    logChanges: true,
    // Include old and new storage account IDs
    includeAccountIds: true,
    // Include user ID and timestamp
    includeUserAndTimestamp: true,
    // Include reason for change
    includeReason: true
  }
} as const