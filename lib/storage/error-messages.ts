/**
 * Storage Error Messages and Utilities
 * Centralized error messages for storage-related issues
 */

import { StorageAccountStatus } from "./account-states"

export interface StorageErrorInfo {
  title: string
  message: string
  actionRequired: 'reconnect' | 'reactivate' | 'fix' | 'none'
  severity: 'error' | 'warning' | 'info'
}

/**
 * Get user-friendly error message for storage account status
 */
export function getStorageErrorMessage(
  status: StorageAccountStatus | string,
  provider: 'google_drive' | 'dropbox' | string,
  context: 'portal_activation' | 'file_access' | 'upload' | 'general' = 'general'
): StorageErrorInfo {
  const providerName = provider === 'google_drive' ? 'Google Drive' : 'Dropbox'
  
  switch (status) {
    case StorageAccountStatus.DISCONNECTED:
    case 'DISCONNECTED':
      return {
        title: getContextualTitle(context, 'Storage Disconnected'),
        message: `Your ${providerName} storage account is disconnected. Please reconnect your storage account first in the Integrations page.`,
        actionRequired: 'reconnect',
        severity: 'error'
      }
      
    case StorageAccountStatus.INACTIVE:
    case 'INACTIVE':
      return {
        title: getContextualTitle(context, 'Storage Deactivated'),
        message: `Your ${providerName} storage account is deactivated. Please reactivate your storage account first in the Integrations page.`,
        actionRequired: 'reactivate',
        severity: 'error'
      }
      
    case StorageAccountStatus.ERROR:
    case 'ERROR':
      return {
        title: getContextualTitle(context, 'Storage Connection Issues'),
        message: `There are connection issues with your ${providerName} storage account. Please check your storage connection in the Integrations page.`,
        actionRequired: 'fix',
        severity: 'error'
      }
      
    default:
      return {
        title: 'Storage Issue',
        message: `There is an issue with your ${providerName} storage account. Please check your storage connection.`,
        actionRequired: 'fix',
        severity: 'warning'
      }
  }
}

/**
 * Get contextual title based on the operation being performed
 */
function getContextualTitle(context: string, defaultTitle: string): string {
  switch (context) {
    case 'portal_activation':
      return 'Cannot Activate Portal'
    case 'file_access':
      return 'File Unavailable'
    case 'upload':
      return 'Upload Failed'
    default:
      return defaultTitle
  }
}

/**
 * Get action button text based on required action
 */
export function getActionButtonText(actionRequired: string): string {
  switch (actionRequired) {
    case 'reconnect':
      return 'Reconnect Storage'
    case 'reactivate':
      return 'Reactivate Storage'
    case 'fix':
      return 'Fix Storage'
    default:
      return 'Check Storage'
  }
}

/**
 * Get navigation URL for fixing storage issues
 */
export function getStorageFixUrl(actionRequired: string): string {
  // All storage management happens in the integrations page
  return '/dashboard/integrations'
}

/**
 * Check if a storage account status allows portal activation
 */
export function canActivatePortal(status: StorageAccountStatus | string): boolean {
  return status === StorageAccountStatus.ACTIVE || status === 'ACTIVE'
}

/**
 * Check if a storage account status allows file access
 */
export function canAccessFiles(status: StorageAccountStatus | string): boolean {
  // Files can be accessed if storage is ACTIVE or INACTIVE (but not DISCONNECTED or ERROR)
  return status === StorageAccountStatus.ACTIVE || 
         status === StorageAccountStatus.INACTIVE ||
         status === 'ACTIVE' || 
         status === 'INACTIVE'
}

/**
 * Check if a storage account status allows new uploads
 */
export function canCreateUploads(status: StorageAccountStatus | string): boolean {
  // Only ACTIVE storage accounts can accept new uploads
  return status === StorageAccountStatus.ACTIVE || status === 'ACTIVE'
}

/**
 * Get comprehensive storage status info for UI display
 */
export function getStorageStatusInfo(status: StorageAccountStatus | string) {
  switch (status) {
    case StorageAccountStatus.ACTIVE:
    case 'ACTIVE':
      return {
        label: 'Active',
        color: 'green',
        description: 'Storage is connected and working properly',
        canActivatePortals: true,
        canAccessFiles: true,
        canCreateUploads: true
      }
      
    case StorageAccountStatus.INACTIVE:
    case 'INACTIVE':
      return {
        label: 'Inactive',
        color: 'yellow',
        description: 'Storage is deactivated but files are still accessible',
        canActivatePortals: false,
        canAccessFiles: true,
        canCreateUploads: false
      }
      
    case StorageAccountStatus.DISCONNECTED:
    case 'DISCONNECTED':
      return {
        label: 'Disconnected',
        color: 'red',
        description: 'Storage is disconnected and files are not accessible',
        canActivatePortals: false,
        canAccessFiles: false,
        canCreateUploads: false
      }
      
    case StorageAccountStatus.ERROR:
    case 'ERROR':
      return {
        label: 'Error',
        color: 'red',
        description: 'Storage has connection issues',
        canActivatePortals: false,
        canAccessFiles: false,
        canCreateUploads: false
      }
      
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        description: 'Storage status is unknown',
        canActivatePortals: false,
        canAccessFiles: false,
        canCreateUploads: false
      }
  }
}