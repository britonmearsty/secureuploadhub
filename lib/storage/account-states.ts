/**
 * Storage Account State Management
 * Defines states, transitions, and enforcement rules for storage accounts
 */

import { StorageAccountStatus } from "@prisma/client"

// Re-export the Prisma enum for consistency
export { StorageAccountStatus }

/**
 * State Transition Rules
 * Defines which state transitions are allowed
 */
export const ALLOWED_TRANSITIONS: Record<StorageAccountStatus, StorageAccountStatus[]> = {
  [StorageAccountStatus.ACTIVE]: [
    StorageAccountStatus.INACTIVE,
    StorageAccountStatus.DISCONNECTED,
    StorageAccountStatus.ERROR
  ],
  [StorageAccountStatus.INACTIVE]: [
    StorageAccountStatus.ACTIVE,
    StorageAccountStatus.DISCONNECTED,
    StorageAccountStatus.ERROR
  ],
  [StorageAccountStatus.DISCONNECTED]: [
    StorageAccountStatus.ACTIVE,    // If OAuth is re-established
    StorageAccountStatus.ERROR      // If reconnection fails
  ],
  [StorageAccountStatus.ERROR]: [
    StorageAccountStatus.ACTIVE,    // If error is resolved
    StorageAccountStatus.INACTIVE,  // If user manually deactivates
    StorageAccountStatus.DISCONNECTED // If OAuth is revoked during error
  ]
}

/**
 * Action Enforcement Rules
 * Defines what actions are allowed per state
 */
export interface StorageAccountCapabilities {
  canCreateNewUploads: boolean      // Can be selected for new portals/uploads
  canAccessExistingFiles: boolean   // Can download/view existing files
  canCreateFolders: boolean         // Can create new folders in storage
  canListFolders: boolean          // Can browse folder structure
  canBeDeleted: boolean            // Can be safely removed from system
  requiresReauth: boolean          // Needs OAuth re-authentication
  showInUI: boolean               // Should appear in storage selection UI
}

export const STATE_CAPABILITIES: Record<StorageAccountStatus, StorageAccountCapabilities> = {
  [StorageAccountStatus.ACTIVE]: {
    canCreateNewUploads: true,
    canAccessExistingFiles: true,
    canCreateFolders: true,
    canListFolders: true,
    canBeDeleted: false,           // Has active data
    requiresReauth: false,
    showInUI: true
  },
  [StorageAccountStatus.INACTIVE]: {
    canCreateNewUploads: false,    // Key difference from ACTIVE
    canAccessExistingFiles: true,
    canCreateFolders: false,
    canListFolders: true,
    canBeDeleted: false,           // Still has accessible data
    requiresReauth: false,
    showInUI: true                 // Show but disabled for new uploads
  },
  [StorageAccountStatus.DISCONNECTED]: {
    canCreateNewUploads: false,
    canAccessExistingFiles: false, // OAuth revoked, no access
    canCreateFolders: false,
    canListFolders: false,
    canBeDeleted: true,            // Safe to remove (data preserved in cloud)
    requiresReauth: true,
    showInUI: false               // Hide until reconnected
  },
  [StorageAccountStatus.ERROR]: {
    canCreateNewUploads: false,
    canAccessExistingFiles: false, // Temporary access issues
    canCreateFolders: false,
    canListFolders: false,
    canBeDeleted: false,           // Don't delete during temporary errors
    requiresReauth: false,         // May resolve automatically
    showInUI: true                 // Show with error indicator
  }
}

/**
 * Validate if a state transition is allowed
 */
export function isTransitionAllowed(
  fromState: StorageAccountStatus,
  toState: StorageAccountStatus
): boolean {
  return ALLOWED_TRANSITIONS[fromState]?.includes(toState) ?? false
}

/**
 * Get capabilities for a storage account state
 */
export function getAccountCapabilities(status: StorageAccountStatus): StorageAccountCapabilities {
  return STATE_CAPABILITIES[status]
}

/**
 * Check if an account can be used for new uploads
 */
export function canCreateUploads(status: StorageAccountStatus): boolean {
  return STATE_CAPABILITIES[status].canCreateNewUploads
}

/**
 * Check if existing files can be accessed
 */
export function canAccessFiles(status: StorageAccountStatus): boolean {
  return STATE_CAPABILITIES[status].canAccessExistingFiles
}

/**
 * Determine if account should be shown in UI
 */
export function shouldShowInUI(status: StorageAccountStatus): boolean {
  return STATE_CAPABILITIES[status].showInUI
}

/**
 * CRITICAL: File and Portal Binding Enforcement
 * Files and portals must remember which storage they belong to — forever.
 */
export const BINDING_ENFORCEMENT_RULES = {
  // Files are permanently bound to their storage account
  FILE_BINDING: {
    // Once a file is uploaded to a storage account, the binding is permanent
    isPermanent: true,
    // Files retain their storage account reference even if account is DISCONNECTED
    preserveOnDisconnect: true,
    // Files cannot be moved between storage accounts
    allowTransfer: false,
    // File access depends on storage account state
    accessControlledByAccountState: true
  },
  
  // Portals are bound to storage accounts but can be updated
  PORTAL_BINDING: {
    // Portals can change storage accounts (affects future uploads only)
    isPermanent: false,
    // Existing uploads in portal keep their original storage account
    preserveExistingUploads: true,
    // Portal can only use ACTIVE storage accounts for new uploads
    requiresActiveAccount: true,
    // Portal binding change doesn't affect existing files
    changeDoesNotAffectExistingFiles: true
  }
} as const

/**
 * State transition reasons for audit logging
 */
export enum StateTransitionReason {
  USER_DEACTIVATED = "USER_DEACTIVATED",
  USER_REACTIVATED = "USER_REACTIVATED", 
  OAUTH_REVOKED = "OAUTH_REVOKED",
  OAUTH_RESTORED = "OAUTH_RESTORED",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  ERROR_RESOLVED = "ERROR_RESOLVED",
  SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE"
}