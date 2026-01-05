/**
 * User-Facing Messages for Storage States
 * Clear, non-technical copy for all storage-related states
 */

/**
 * Disconnect Warning Text
 */
export const DISCONNECT_WARNINGS = {
  /**
   * Warning before disconnecting storage account
   */
  BEFORE_DISCONNECT: {
    title: "Disconnect Storage Account?",
    message: "Your files will remain safely stored in your cloud storage, but you won't be able to access them through this app until you reconnect.",
    details: [
      "Existing files will become temporarily unavailable",
      "Portals using this account will stop accepting new uploads", 
      "You can reconnect anytime to restore full access",
      "Your files remain safe in your cloud storage"
    ],
    confirmButton: "Disconnect Account",
    cancelButton: "Keep Connected"
  },

  /**
   * Confirmation after successful disconnect
   */
  AFTER_DISCONNECT: {
    title: "Account Disconnected",
    message: "Your storage account has been disconnected. Your files remain safe in your cloud storage.",
    action: "You can reconnect anytime in Settings to restore access to your files."
  },

  /**
   * Warning when disconnecting account with active portals
   */
  WITH_ACTIVE_PORTALS: {
    title: "This Will Affect Your Portals",
    message: "Disconnecting this account will stop uploads to portals that use it.",
    affectedPortals: "Affected portals:",
    impact: "These portals will stop accepting new files until you reconnect or choose a different storage account.",
    confirmButton: "Disconnect Anyway",
    cancelButton: "Cancel"
  }
} as const

/**
 * File Status Labels
 */
export const FILE_STATUS_LABELS = {
  /**
   * File access states based on storage account status
   */
  ACCESSIBLE: {
    label: "Available",
    description: "File is ready to download",
    icon: "check-circle"
  },

  TEMPORARILY_UNAVAILABLE: {
    label: "Temporarily Unavailable", 
    description: "Connection issues with your storage account",
    helpText: "This usually resolves automatically. If it persists, try reconnecting your storage account.",
    icon: "clock"
  },

  STORAGE_DISCONNECTED: {
    label: "Storage Disconnected",
    description: "Your storage account needs to be reconnected",
    helpText: "Go to Settings to reconnect your storage account and access this file.",
    action: "Reconnect Storage",
    icon: "unlink"
  },

  STORAGE_INACTIVE: {
    label: "Available",
    description: "File is ready to download",
    note: "Your storage account is inactive for new uploads, but existing files remain accessible.",
    icon: "check-circle"
  },

  LEGACY_FILE: {
    label: "Available",
    description: "File is ready to download",
    icon: "check-circle"
  },

  UPLOAD_FAILED: {
    label: "Upload Failed",
    description: "File could not be uploaded to your storage",
    icon: "x-circle"
  },

  UPLOADING: {
    label: "Uploading",
    description: "File is being uploaded to your storage",
    icon: "upload"
  }
} as const

/**
 * Portal Warning Messages
 */
export const PORTAL_WARNINGS = {
  /**
   * Portal cannot accept uploads
   */
  UPLOADS_BLOCKED: {
    STORAGE_DISCONNECTED: {
      title: "Storage Disconnected",
      message: "This portal can't accept new files because your storage account is disconnected.",
      action: "Reconnect your storage account to resume uploads.",
      severity: "error"
    },

    STORAGE_INACTIVE: {
      title: "Storage Account Inactive", 
      message: "This portal can't accept new files because your storage account is set to inactive.",
      action: "Reactivate your storage account or choose a different one.",
      severity: "warning"
    },

    STORAGE_ERROR: {
      title: "Connection Issues",
      message: "This portal can't accept new files due to temporary connection issues.",
      action: "This usually resolves automatically. If it persists, try reconnecting your storage account.",
      severity: "warning"
    },

    NO_STORAGE_CONFIGURED: {
      title: "Storage Not Configured",
      message: "This portal needs a storage account to accept files.",
      action: "Connect a storage account to start receiving uploads.",
      severity: "error"
    },

    STORAGE_NOT_FOUND: {
      title: "Storage Account Missing",
      message: "This portal's storage account is no longer available.",
      action: "Choose a different storage account to resume uploads.",
      severity: "error"
    }
  },

  /**
   * Portal status indicators
   */
  STATUS_INDICATORS: {
    OPERATIONAL: {
      label: "Accepting Uploads",
      message: "Portal is working normally",
      color: "green"
    },

    DEGRADED: {
      label: "Limited Access",
      message: "New uploads blocked, existing files may be accessible",
      color: "yellow"
    },

    OFFLINE: {
      label: "Uploads Blocked", 
      message: "Portal cannot accept new files",
      color: "red"
    }
  },

  /**
   * Portal creation warnings
   */
  CREATION_BLOCKED: {
    NO_STORAGE_ACCOUNTS: {
      title: "Connect Storage First",
      message: "You need to connect a cloud storage account before creating portals.",
      action: "Connect Google Drive or Dropbox in Settings.",
      severity: "info"
    },

    NO_ACTIVE_ACCOUNTS: {
      title: "No Active Storage Accounts",
      message: "All your storage accounts are inactive or disconnected.",
      action: "Reactivate a storage account or connect a new one.",
      severity: "warning"
    },

    SELECTED_ACCOUNT_INACTIVE: {
      title: "Selected Account Unavailable",
      message: "The storage account you selected is not active.",
      action: "Choose a different storage account or reactivate this one.",
      severity: "warning"
    }
  }
} as const

/**
 * Storage Account Status Messages
 */
export const STORAGE_ACCOUNT_MESSAGES = {
  /**
   * Status labels for storage accounts
   */
  STATUS_LABELS: {
    ACTIVE: {
      label: "Connected",
      description: "Ready for uploads and file access",
      color: "green"
    },

    INACTIVE: {
      label: "Inactive",
      description: "Not accepting new uploads, existing files accessible",
      color: "yellow"
    },

    DISCONNECTED: {
      label: "Disconnected", 
      description: "Needs reconnection to access files",
      color: "red"
    },

    ERROR: {
      label: "Connection Issues",
      description: "Temporary problems, may resolve automatically",
      color: "orange"
    }
  },

  /**
   * Action prompts for each status
   */
  ACTION_PROMPTS: {
    ACTIVE: {
      primary: null, // No action needed
      secondary: "Manage account settings"
    },

    INACTIVE: {
      primary: "Reactivate Account",
      secondary: "This will allow new uploads to portals using this account"
    },

    DISCONNECTED: {
      primary: "Reconnect Account",
      secondary: "Restore access to your files and resume uploads"
    },

    ERROR: {
      primary: "Retry Connection",
      secondary: "Check connection or wait for automatic retry"
    }
  }
} as const

/**
 * Upload Error Messages
 */
export const UPLOAD_ERROR_MESSAGES = {
  /**
   * User-friendly upload error messages
   */
  PORTAL_NOT_ACCEPTING: {
    title: "Upload Not Accepted",
    message: "This portal isn't accepting files right now.",
    suggestion: "The portal owner may need to fix their storage connection."
  },

  STORAGE_DISCONNECTED: {
    title: "Storage Connection Lost",
    message: "The upload couldn't complete because the storage account is disconnected.",
    suggestion: "Please try again later or contact the portal owner."
  },

  STORAGE_ERROR: {
    title: "Storage Connection Issues", 
    message: "There's a temporary problem with the storage connection.",
    suggestion: "Please try again in a few minutes."
  },

  STORAGE_FULL: {
    title: "Storage Space Full",
    message: "The storage account doesn't have enough space for this file.",
    suggestion: "Please contact the portal owner or try a smaller file."
  },

  FILE_TOO_LARGE: {
    title: "File Too Large",
    message: "This file exceeds the maximum size allowed for this portal.",
    suggestion: "Please try a smaller file or contact the portal owner."
  }
} as const

/**
 * Settings Page Messages
 */
export const SETTINGS_MESSAGES = {
  /**
   * Storage accounts section
   */
  STORAGE_ACCOUNTS: {
    sectionTitle: "Connected Storage",
    sectionDescription: "Manage your cloud storage connections for file uploads and access.",
    
    noAccountsTitle: "No Storage Connected",
    noAccountsMessage: "Connect your cloud storage to start creating portals and receiving files.",
    
    connectButton: "Connect Storage Account",
    disconnectButton: "Disconnect",
    reactivateButton: "Reactivate",
    retryButton: "Retry Connection"
  },

  /**
   * Portal storage configuration
   */
  PORTAL_STORAGE: {
    sectionTitle: "Storage Configuration",
    sectionDescription: "Choose which storage account this portal will use for uploaded files.",
    
    currentStorageLabel: "Current Storage:",
    changeStorageButton: "Change Storage Account",
    
    warningTitle: "Important:",
    warningMessage: "Changing storage accounts only affects new uploads. Existing files will remain in their original storage location."
  }
} as const

/**
 * Help Text and Tooltips
 */
export const HELP_TEXT = {
  /**
   * Storage account concepts
   */
  STORAGE_ACCOUNTS: {
    whatAreThey: "Storage accounts are your connected cloud storage services like Google Drive or Dropbox.",
    whyMultiple: "You can connect multiple accounts to organize different portals or provide backup options.",
    howTheyWork: "Each portal uses one storage account. Files uploaded to that portal are saved to the connected storage."
  },

  /**
   * File binding concepts
   */
  FILE_BINDING: {
    whatIsIt: "Files remember which storage account they were uploaded to, even if you change the portal's storage later.",
    whyImportant: "This ensures your files always remain accessible from their original storage location.",
    cannotChange: "Files cannot be moved between storage accounts - they stay where they were originally uploaded."
  },

  /**
   * Portal storage concepts  
   */
  PORTAL_STORAGE: {
    howItWorks: "Each portal is connected to one storage account. All files uploaded to that portal go to that storage.",
    changingStorage: "You can change which storage account a portal uses, but this only affects new uploads.",
    existingFiles: "Files already uploaded will remain in their original storage location."
  }
} as const

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  STORAGE_CONNECTED: {
    title: "Storage Connected Successfully",
    message: "You can now use this account for your portals and file uploads."
  },

  STORAGE_RECONNECTED: {
    title: "Storage Reconnected",
    message: "Your files are now accessible again and portals can resume accepting uploads."
  },

  STORAGE_REACTIVATED: {
    title: "Storage Account Reactivated", 
    message: "This account can now be used for new uploads."
  },

  PORTAL_STORAGE_CHANGED: {
    title: "Portal Storage Updated",
    message: "New uploads to this portal will use the selected storage account."
  }
} as const