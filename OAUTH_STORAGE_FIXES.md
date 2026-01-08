# 🔧 OAuth & Storage Account Critical Fixes

## **ISSUE 1: Race Conditions - Multiple OAuth Flows Could Create Duplicates**

### **Problem:**
Multiple simultaneous OAuth flows for the same user/provider can create duplicate storage accounts because the current locking mechanism isn't comprehensive enough.

### **Solution: Enhanced Race Condition Protection**

```typescript
// lib/storage/oauth-race-protection.ts
import { withDistributedLock } from "@/lib/distributed-lock"
import { SingleEmailStorageManager } from "./single-email-manager"

export class OAuthRaceProtection {
  /**
   * OAuth-specific lock that prevents duplicate storage account creation
   */
  static async safeOAuthStorageCreation(
    userId: string,
    provider: "google" | "dropbox",
    providerAccountId: string,
    userEmail: string,
    userName: string | null
  ) {
    // Create a user+provider specific lock (not account-specific)
    const lockKey = `oauth-storage-creation:${userId}:${provider}`
    const lockTimeout = 30000 // 30 seconds
    
    return await withDistributedLock(lockKey, async () => {
      console.log(`🔒 OAUTH_RACE_PROTECTION: Acquired lock for ${userId}:${provider}`)
      
      // Double-check if storage account already exists
      const existing = await SingleEmailStorageManager.getStorageAccount(userId, provider)
      if (existing) {
        console.log(`✅ OAUTH_RACE_PROTECTION: Found existing account, updating`)
        return await SingleEmailStorageManager.autoDetectStorageAccount(
          userId, provider, providerAccountId
        )
      }
      
      // Create new storage account
      console.log(`🆕 OAUTH_RACE_PROTECTION: Creating new storage account`)
      return await SingleEmailStorageManager.autoDetectStorageAccount(
        userId, provider, providerAccountId
      )
    }, lockTimeout)
  }
}
```

### **Implementation in auth.ts:**

```typescript
// In auth.ts - Update linkAccount event
async linkAccount({ user, account }) {
  console.log(`🔗 LINK_ACCOUNT EVENT: userId=${user.id}, provider=${account?.provider}`)
  
  if (user.id && account && ["google", "dropbox"].includes(account.provider)) {
    try {
      // Use race-protected creation instead of direct call
      const result = await OAuthRaceProtection.safeOAuthStorageCreation(
        user.id,
        account.provider as "google" | "dropbox",
        account.providerAccountId,
        user.email || "",
        user.name
      )
      
      if (result.success) {
        console.log(`✅ LINK_ACCOUNT: StorageAccount ${result.created ? 'created' : 'updated'}`)
      } else {
        console.error(`❌ LINK_ACCOUNT: Failed:`, result.error)
        // CRITICAL: Surface this error to user
        throw new Error(`Storage setup failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`❌ LINK_ACCOUNT: Exception:`, error)
      // Don't throw - we don't want to break OAuth flow
      // But log for monitoring
    }
  }
}
```

---

## **ISSUE 2: No Recovery - DISCONNECTED Accounts Need Manual Intervention**

### **Problem:**
When OAuth tokens fail and accounts go to DISCONNECTED state, there's no automatic recovery mechanism.

### **Solution: Automatic Recovery System**

```typescript
// lib/storage/auto-recovery.ts
export class StorageAccountRecovery {
  /**
   * Attempt to recover DISCONNECTED storage accounts
   */
  static async attemptRecovery(userId: string, provider: "google" | "dropbox") {
    console.log(`🔄 RECOVERY: Attempting recovery for ${userId}:${provider}`)
    
    try {
      // Check if OAuth account still exists and has valid tokens
      const hasValidOAuth = await SingleEmailStorageManager.hasOAuthAccess(userId, provider)
      
      if (hasValidOAuth) {
        // OAuth is working, reactivate storage account
        const result = await SingleEmailStorageManager.reactivateStorageAccount(userId, provider)
        
        if (result.success) {
          console.log(`✅ RECOVERY: Successfully recovered ${provider} for user ${userId}`)
          return { recovered: true, reason: 'OAuth tokens valid' }
        }
      }
      
      return { recovered: false, reason: 'OAuth tokens invalid' }
    } catch (error) {
      console.error(`❌ RECOVERY: Failed for ${userId}:${provider}:`, error)
      return { recovered: false, reason: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
  
  /**
   * Background job to recover all DISCONNECTED accounts
   */
  static async recoverAllDisconnectedAccounts() {
    console.log(`🔄 RECOVERY: Starting background recovery job`)
    
    const disconnectedAccounts = await prisma.storageAccount.findMany({
      where: { status: 'DISCONNECTED' },
      include: { user: true }
    })
    
    const results = {
      attempted: disconnectedAccounts.length,
      recovered: 0,
      failed: 0
    }
    
    for (const account of disconnectedAccounts) {
      const provider = account.provider === 'google_drive' ? 'google' : 'dropbox'
      const result = await this.attemptRecovery(account.userId, provider)
      
      if (result.recovered) {
        results.recovered++
      } else {
        results.failed++
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`✅ RECOVERY: Background job complete:`, results)
    return results
  }
}
```

### **Integration with Token Refresh:**

```typescript
// In lib/storage/index.ts - Update getValidAccessToken
export async function getValidAccessToken(
  userId: string,
  provider: "google" | "dropbox"
): Promise<{ accessToken: string; providerAccountId: string } | null> {
  // ... existing token logic ...
  
  if (isExpired && account.refresh_token) {
    try {
      const { accessToken, expiresAt } = await service.refreshAccessToken(account.refresh_token)
      
      // Update token in database
      await prisma.account.update({...})
      
      // RECOVERY: If token refresh succeeds, attempt to recover storage account
      try {
        await StorageAccountRecovery.attemptRecovery(userId, provider)
      } catch (recoveryError) {
        console.warn(`Recovery attempt failed but token refresh succeeded:`, recoveryError)
      }
      
      return { accessToken, providerAccountId: account.providerAccountId }
    } catch (error) {
      // Token refresh failed - mark as DISCONNECTED
      await updateStorageAccountStatusOnTokenFailure(userId, provider, error.message)
      return null
    }
  }
}
```

---

## **ISSUE 3: Silent Failures - Storage Creation Failures During OAuth Not Surfaced**

### **Problem:**
When storage account creation fails during OAuth, the error is logged but not surfaced to the user.

### **Solution: Error Surfacing System**

```typescript
// lib/storage/oauth-error-tracking.ts
export class OAuthErrorTracking {
  /**
   * Track OAuth storage creation errors for user notification
   */
  static async trackStorageCreationError(
    userId: string,
    provider: string,
    error: string,
    context: 'oauth' | 'manual'
  ) {
    // Store error in database for user notification
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STORAGE_CREATION_FAILED',
        details: {
          provider,
          error,
          context,
          timestamp: new Date().toISOString()
        },
        severity: 'ERROR'
      }
    })
    
    // Create user notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'STORAGE_ERROR',
        title: 'Storage Setup Issue',
        message: `Failed to set up ${provider} storage: ${error}`,
        actionUrl: '/dashboard/settings/integrations',
        actionText: 'Fix Storage',
        isRead: false
      }
    })
    
    console.log(`📢 OAUTH_ERROR: Created notification for user ${userId}`)
  }
  
  /**
   * Check for recent storage creation errors
   */
  static async getRecentStorageErrors(userId: string) {
    const recentErrors = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'STORAGE_CREATION_FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return recentErrors.map(error => ({
      provider: error.details.provider,
      error: error.details.error,
      timestamp: error.createdAt
    }))
  }
}
```

### **Updated OAuth Flow with Error Surfacing:**

```typescript
// In auth.ts - Enhanced error handling
async linkAccount({ user, account }) {
  if (user.id && account && ["google", "dropbox"].includes(account.provider)) {
    try {
      const result = await OAuthRaceProtection.safeOAuthStorageCreation(...)
      
      if (!result.success) {
        // CRITICAL: Surface error to user
        await OAuthErrorTracking.trackStorageCreationError(
          user.id,
          account.provider,
          result.error || 'Unknown error',
          'oauth'
        )
        
        console.error(`❌ LINK_ACCOUNT: Storage creation failed, user notified`)
      }
    } catch (error) {
      // Track unexpected errors too
      await OAuthErrorTracking.trackStorageCreationError(
        user.id,
        account.provider,
        error instanceof Error ? error.message : 'Unexpected error',
        'oauth'
      )
    }
  }
}
```

---

## **ISSUE 4: Legacy Inconsistencies - Some Code Uses Old Status Values**

### **Problem:**
Some code still references `DISCONNECTED` instead of `INACTIVE`, causing confusion and potential bugs.

### **Solution: Comprehensive Status Migration**

```typescript
// lib/storage/status-migration.ts
export class StatusMigration {
  /**
   * Migrate all legacy status references
   */
  static async migrateLegacyStatuses() {
    console.log(`🔄 STATUS_MIGRATION: Starting legacy status migration`)
    
    // 1. Update any DISCONNECTED storage accounts to INACTIVE
    const disconnectedAccounts = await prisma.storageAccount.updateMany({
      where: { status: 'DISCONNECTED' },
      data: { status: 'INACTIVE' }
    })
    
    console.log(`✅ STATUS_MIGRATION: Updated ${disconnectedAccounts.count} DISCONNECTED accounts to INACTIVE`)
    
    // 2. Ensure isActive field matches status
    await prisma.storageAccount.updateMany({
      where: { status: 'ACTIVE' },
      data: { isActive: true }
    })
    
    await prisma.storageAccount.updateMany({
      where: { status: { not: 'ACTIVE' } },
      data: { isActive: false }
    })
    
    console.log(`✅ STATUS_MIGRATION: Synchronized isActive field with status`)
    
    return {
      migratedAccounts: disconnectedAccounts.count,
      synchronizedFields: true
    }
  }
  
  /**
   * Validate status consistency across the system
   */
  static async validateStatusConsistency() {
    const inconsistencies = await prisma.storageAccount.findMany({
      where: {
        OR: [
          { status: 'ACTIVE', isActive: false },
          { status: { not: 'ACTIVE' }, isActive: true }
        ]
      }
    })
    
    if (inconsistencies.length > 0) {
      console.warn(`⚠️ STATUS_VALIDATION: Found ${inconsistencies.length} inconsistent records`)
      return { consistent: false, inconsistencies: inconsistencies.length }
    }
    
    console.log(`✅ STATUS_VALIDATION: All records consistent`)
    return { consistent: true, inconsistencies: 0 }
  }
}
```

### **Status Helper Functions:**

```typescript
// lib/storage/status-helpers.ts
export class StatusHelpers {
  /**
   * Normalize legacy status values
   */
  static normalizeStatus(status: string): StorageAccountStatus {
    switch (status.toLowerCase()) {
      case 'disconnected':
        return StorageAccountStatus.INACTIVE // Map old DISCONNECTED to INACTIVE
      case 'active':
        return StorageAccountStatus.ACTIVE
      case 'inactive':
        return StorageAccountStatus.INACTIVE
      case 'error':
        return StorageAccountStatus.ERROR
      default:
        console.warn(`Unknown status: ${status}, defaulting to INACTIVE`)
        return StorageAccountStatus.INACTIVE
    }
  }
  
  /**
   * Get user-friendly status display
   */
  static getStatusDisplay(status: StorageAccountStatus): {
    label: string
    color: string
    description: string
  } {
    switch (status) {
      case StorageAccountStatus.ACTIVE:
        return {
          label: 'Connected',
          color: 'green',
          description: 'Storage is active and ready for uploads'
        }
      case StorageAccountStatus.INACTIVE:
        return {
          label: 'Deactivated',
          color: 'yellow',
          description: 'Storage is deactivated but files remain accessible'
        }
      case StorageAccountStatus.ERROR:
        return {
          label: 'Connection Error',
          color: 'red',
          description: 'Temporary connection issues, may resolve automatically'
        }
      default:
        return {
          label: 'Unknown',
          color: 'gray',
          description: 'Unknown status'
        }
    }
  }
}
```

---

## **IMPLEMENTATION PLAN**

### **Phase 1: Critical Race Condition Fix**
1. Implement `OAuthRaceProtection` class
2. Update `auth.ts` to use race-protected creation
3. Test with multiple simultaneous OAuth flows

### **Phase 2: Auto-Recovery System**
1. Implement `StorageAccountRecovery` class
2. Add recovery attempts to token refresh flow
3. Create background job for periodic recovery

### **Phase 3: Error Surfacing**
1. Implement `OAuthErrorTracking` class
2. Add user notifications for storage failures
3. Create dashboard alerts for storage issues

### **Phase 4: Status Migration**
1. Run `StatusMigration.migrateLegacyStatuses()`
2. Update all UI components to use consistent terminology
3. Add validation to prevent future inconsistencies

### **Phase 5: Monitoring & Alerts**
1. Add comprehensive logging for all storage operations
2. Create monitoring dashboard for storage account health
3. Set up alerts for high failure rates

This comprehensive fix addresses all four critical issues while maintaining backward compatibility and providing robust error handling.