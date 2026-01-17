# Storage Disconnect Implementation - Changes Summary

**Date:** January 16, 2026  
**Purpose:** Simplified storage management by removing deactivate/reactivate functionality and keeping only disconnect/reconnect

---

## Overview

Restored the original simpler storage management approach:
- **Removed:** Deactivate/Reactivate functionality (INACTIVE status management)
- **Kept:** Disconnect functionality (DISCONNECTED status)
- **Reconnection:** Users must go through OAuth flow to reconnect

---

## Changes Made

### 1. API Routes

#### Modified
- **`app/api/storage/disconnect/route.ts`**
  - Renamed from "deactivate" to "disconnect"
  - Now deletes OAuth account and sets status to DISCONNECTED
  - Automatically deactivates affected portals

#### Deleted
- **`app/api/storage/deactivate/route.ts`** - Removed (functionality replaced by disconnect)
- **`app/api/storage/reactivate/route.ts`** - Removed (reconnection happens through OAuth)
- **`app/api/storage/reconnect/route.ts`** - Removed (reconnection happens through OAuth flow)

### 2. Backend Logic

#### Modified: `lib/storage/single-email-manager.ts`
- **Removed Functions:**
  - `deactivateStorageAccount()` - No longer needed
  - `reactivateStorageAccount()` - No longer needed

- **Added Function:**
  - `disconnectStorageAccount()` - Disconnects storage and removes OAuth
    ```typescript
    static async disconnectStorageAccount(userId: string, provider: "google" | "dropbox") {
      // Delete OAuth account(s)
      await prisma.account.deleteMany({ where: { userId, provider } })
      
      // Update storage account status to DISCONNECTED
      await prisma.storageAccount.updateMany({
        where: { userId, provider: storageProvider },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          isActive: false,
          lastError: "Disconnected by user"
        }
      })
      
      // Deactivate affected portals
      // ...
    }
    ```

### 3. UI Components

#### Modified: `app/dashboard/settings/components/ConnectedAccounts.tsx`

**Removed:**
- `deactivating` state → replaced with `disconnecting`
- `fixing` state and "Fix Storage" button
- `syncing` state and "Sync Status" button
- `handleDeactivate()` function
- `handleReactivate()` function
- `handleFixStorage()` function
- `handleSyncStatus()` function
- `handleRefreshToken()` function
- Debug/Refresh section with multiple buttons

**Added:**
- `handleDisconnect()` function - Disconnects storage account
- Simplified UI showing only connected accounts (ACTIVE status)
- Connect button for disconnected providers

**UI Changes:**
- Shows only accounts with `isConnected && storageStatus === 'ACTIVE'`
- Removed complex status indicators (OAuth status, storage status separately)
- Single "Disconnect" button for connected accounts
- Single "Connect" button for disconnected providers
- Removed "Reactivate", "Refresh Token", "Fix Storage", "Sync Status" buttons

**Before:**
```tsx
// Showed all accounts (ACTIVE, INACTIVE, DISCONNECTED, ERROR)
// Multiple buttons: Deactivate, Reactivate, Refresh Token, Fix Storage, Sync Status
// Complex status indicators
```

**After:**
```tsx
// Shows only CONNECTED accounts (ACTIVE status)
// Single button: Disconnect
// Simple status: "Connected and Active"
// To reconnect: User must click "Connect" and go through OAuth
```

### 4. File Operations

#### Modified Files:
- `app/dashboard/assets/AssetsClient.tsx`
- `app/dashboard/clients/ClientsClient.tsx`

**Changes:**
- Updated error messages from "INACTIVE" to "DISCONNECTED"
- Changed error title from "File Unavailable" to "Storage Disconnected"
- Updated message to mention "disconnected" instead of "deactivated"

**Before:**
```typescript
if (status === 'INACTIVE') {
    showToast('error', 'File Unavailable', 
        `Cannot delete file. Your ${provider} storage account is deactivated.`)
}
```

**After:**
```typescript
if (status === 'DISCONNECTED') {
    showToast('error', 'Storage Disconnected', 
        `Cannot delete file. Your ${provider} storage account is disconnected. Please reconnect to access this file.`)
}
```

### 5. Portal Components

#### Modified: `app/dashboard/components/PortalList.tsx`

**No changes needed** - Already had proper storage validation:
- Checks storage account status before portal activation
- Uses `getStorageErrorMessage()` for consistent error messages
- Prevents activation if storage is not ACTIVE
- Shows appropriate error for DISCONNECTED, ERROR, or INACTIVE status

---

## User Flow

### Before (Complex)
```
1. User has storage connected (ACTIVE)
2. User clicks "Deactivate Storage"
   → Storage becomes INACTIVE
   → Portals auto-deactivate
   → Files still accessible
3. User clicks "Reactivate Storage"
   → Storage becomes ACTIVE
   → Portals auto-reactivate
   → Everything works again

OR

1. User clicks "Disconnect" (OAuth revoked)
   → Storage becomes DISCONNECTED
   → Portals auto-deactivate
   → Files NOT accessible
2. User must reconnect through OAuth
```

### After (Simple)
```
1. User has storage connected (ACTIVE)
2. User clicks "Disconnect"
   → OAuth account deleted
   → Storage becomes DISCONNECTED
   → Portals auto-deactivate
   → Files NOT accessible
   → Account removed from "Connected" list
3. To reconnect:
   → User clicks "Connect Google Drive" or "Connect Dropbox"
   → Goes through OAuth flow
   → Storage becomes ACTIVE
   → Account appears in "Connected" list
   → User can reactivate portals manually
```

---

### 6. UI Component Updates

#### Modified: `components/ui/StorageWarningModal.tsx`

**Removed:**
- `'deactivated'` and `'inactive'` types
- `onReactivate` prop and functionality
- "Reactivate Storage" buttons

**Updated:**
- Only supports `'disconnected'`, `'error'`, and `'not_configured'` types
- All actions redirect to Settings page for reconnection
- Simplified button logic - only `onSettings` callback

#### Modified: `components/assets/FileItem.tsx`

**Updated:**
- Changed status check from `'INACTIVE'` to `'DISCONNECTED'`
- Updated error messages from "deactivated" to "disconnected"

#### Modified: `app/dashboard/components/PortalList.tsx`

**Updated:**
- Portal activation checks now use `'DISCONNECTED'` instead of `'INACTIVE'`
- Status badges show "Disconnected" instead of "Deactivated"
- Warning messages updated to mention reconnection in Settings
- Error handling updated to remove deactivated references

#### Modified: Test Files

**Updated:**
- `app/test-disconnect/page.tsx` - Changed API call from `/api/storage/deactivate` to `/api/storage/disconnect`
- `app/debug-all/page.tsx` - Changed API call from `/api/storage/deactivate` to `/api/storage/disconnect`

#### Modified: `lib/storage/google-oauth-fix.ts`

**Updated:**
- Replaced `reactivateStorageAccount()` method with `reconnectStorageAccount()`
- Updated diagnostic messages from "INACTIVE_STORAGE_ACCOUNT" to "DISCONNECTED_STORAGE_ACCOUNT"
- Now uses `SingleEmailStorageManager.autoDetectStorageAccount()` to reconnect accounts
- Updated recommendations to mention OAuth flow instead of reactivation

---

## Database Schema

**No changes needed** - StorageAccountStatus enum already has:
- `ACTIVE` - Connected and working
- `INACTIVE` - Kept for backward compatibility (not used in new flow)
- `DISCONNECTED` - OAuth revoked, files inaccessible
- `ERROR` - Connection issues

---

## Error Messages

**Already handled properly** in `lib/storage/error-messages.ts`:

```typescript
case StorageAccountStatus.DISCONNECTED:
  return {
    title: 'Storage Disconnected',
    message: `Your ${providerName} storage account is disconnected. 
              Please reconnect your storage account first in the Integrations page.`,
    actionRequired: 'reconnect',
    severity: 'error'
  }
```

---

## Portal Behavior

### When Storage is Disconnected:

1. **Portal Status:**
   - Automatically deactivated
   - Cannot be activated until storage is reconnected
   - Shows error: "Cannot activate portal. Your [provider] storage is disconnected."

2. **File Access:**
   - Download: Blocked with error message
   - Delete: Blocked with error message
   - Upload: Blocked (portal is inactive)

3. **UI Indicators:**
   - Portal shows as inactive
   - Storage status indicator shows "Disconnected"
   - Error messages guide user to reconnect

### After Reconnection:

1. **Storage Status:**
   - OAuth account recreated
   - StorageAccount status → ACTIVE
   - Account appears in "Connected" list

2. **Portal Status:**
   - Remains inactive (not auto-reactivated)
   - User must manually activate portals
   - This gives user control over which portals to reactivate

3. **File Access:**
   - All files become accessible again
   - Download/delete operations work normally

---

## Testing Checklist

### Storage Management
- [ ] Connect Google Drive - appears in connected list
- [ ] Connect Dropbox - appears in connected list
- [ ] Disconnect Google Drive - removed from connected list
- [ ] Disconnect Dropbox - removed from connected list
- [ ] Reconnect Google Drive - appears in connected list again
- [ ] Reconnect Dropbox - appears in connected list again

### Portal Behavior
- [ ] Disconnect storage → portal auto-deactivates
- [ ] Try to activate portal with disconnected storage → shows error
- [ ] Reconnect storage → portal stays inactive
- [ ] Manually activate portal after reconnection → works

### File Operations
- [ ] Try to download file with disconnected storage → shows error
- [ ] Try to delete file with disconnected storage → shows error
- [ ] Reconnect storage → download works
- [ ] Reconnect storage → delete works

### UI Display
- [ ] Connected accounts page shows only ACTIVE accounts
- [ ] Disconnected accounts don't appear in connected list
- [ ] Connect button appears for disconnected providers
- [ ] Disconnect button works and shows loading state
- [ ] Error messages are clear and actionable

---

## Migration Notes

### For Existing Users

**Users with INACTIVE storage accounts:**
- Will see their accounts in the connected list (if OAuth still exists)
- Can disconnect and reconnect to clean up state
- Or system will auto-convert INACTIVE → ACTIVE on next OAuth callback

**Users with DISCONNECTED storage accounts:**
- Will NOT see their accounts in the connected list
- Must click "Connect" to go through OAuth flow
- After reconnection, account becomes ACTIVE

### Database Cleanup (Optional)

```sql
-- Find accounts that are INACTIVE (old deactivate functionality)
SELECT * FROM "StorageAccount" WHERE status = 'INACTIVE';

-- Option 1: Convert INACTIVE to ACTIVE (if OAuth still exists)
UPDATE "StorageAccount" 
SET status = 'ACTIVE', "isActive" = true, "lastError" = NULL
WHERE status = 'INACTIVE' 
AND "userId" IN (
  SELECT DISTINCT "userId" FROM "Account" 
  WHERE provider IN ('google', 'dropbox')
);

-- Option 2: Convert INACTIVE to DISCONNECTED (if OAuth doesn't exist)
UPDATE "StorageAccount" 
SET status = 'DISCONNECTED', "isActive" = false
WHERE status = 'INACTIVE' 
AND "userId" NOT IN (
  SELECT DISTINCT "userId" FROM "Account" 
  WHERE provider IN ('google', 'dropbox')
);
```

---

## Benefits of This Approach

1. **Simpler User Experience:**
   - One action: Disconnect
   - One way to reconnect: OAuth flow
   - No confusion about deactivate vs disconnect

2. **Cleaner UI:**
   - Shows only connected accounts
   - Single button per account
   - No complex status indicators

3. **Better Security:**
   - Disconnect removes OAuth tokens
   - Forces full re-authentication
   - No partial states (INACTIVE)

4. **Easier Maintenance:**
   - Fewer API endpoints
   - Less complex state management
   - Fewer edge cases to handle

5. **Consistent with OAuth Standards:**
   - Disconnect = revoke OAuth
   - Reconnect = new OAuth flow
   - Matches user expectations

---

## Related Files

### Modified
- `app/api/storage/disconnect/route.ts`
- `lib/storage/single-email-manager.ts`
- `lib/storage/google-oauth-fix.ts`
- `app/dashboard/settings/components/ConnectedAccounts.tsx`
- `app/dashboard/assets/AssetsClient.tsx`
- `app/dashboard/clients/ClientsClient.tsx`
- `components/ui/StorageWarningModal.tsx`
- `components/assets/FileItem.tsx`
- `app/dashboard/components/PortalList.tsx`
- `app/test-disconnect/page.tsx`
- `app/debug-all/page.tsx`

### Deleted
- `app/api/storage/deactivate/route.ts`
- `app/api/storage/reactivate/route.ts`
- `app/api/storage/reconnect/route.ts`

### Unchanged (Already Correct)
- `app/dashboard/components/PortalList.tsx` - Portal toggle validation
- `lib/storage/error-messages.ts` - Error message handling
- `app/api/uploads/[id]/route.ts` - File delete validation
- `app/api/uploads/[id]/download/route.ts` - File download validation
- `lib/storage/portal-management.ts` - Portal auto-deactivation
- `prisma/schema.prisma` - Database schema

---

## Rollback Plan

If needed, rollback by:
1. Restore deleted API routes from git history
2. Restore old `single-email-manager.ts` functions
3. Restore old `ConnectedAccounts.tsx` UI
4. Update file operation checks back to INACTIVE

---

**End of Changes Summary**
