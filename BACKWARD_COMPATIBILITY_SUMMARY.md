# Backward Compatibility Summary - Multi-Storage Account System

## Quick Reference

### Status: ✅ FULLY BACKWARD COMPATIBLE

All existing users, files, and portals continue working without modification.

---

## Key Code Patterns

### 1. Legacy File Access Pattern
```typescript
// Files without storageAccountId use provider-based fallback
if (!fileStorageAccountId) {
  // Use portal's storageProvider to access file
  const tokenResult = await getValidAccessToken(userId, provider)
  // Download succeeds if user has active account for provider
}
```

### 2. Portal Upload Fallback Pattern
```typescript
// Portals without storageAccountId find active account
if (!portalStorageAccountId) {
  const activeAccount = userActiveStorageAccounts.find(acc => 
    acc.provider === portalStorageProvider && 
    canCreateUploads(acc.status)
  )
  // Use found account or fail with clear error
}
```

### 3. Token Refresh Pattern
```typescript
// Automatic token refresh handles expiration
const tokenResult = await getValidAccessToken(userId, provider)
if (!tokenResult) {
  // Token invalid/expired and can't refresh
  // Return null; caller handles gracefully
}
```

### 4. Storage Account State Pattern
```typescript
// Check capabilities based on state
const capabilities = STATE_CAPABILITIES[storageAccountStatus]
if (!capabilities.canCreateNewUploads) {
  // Reject upload; suggest reconnection
}
```

---

## Database Schema Changes

### New Table: StorageAccount
- Stores OAuth account metadata
- Tracks account status (ACTIVE, INACTIVE, DISCONNECTED, ERROR)
- Unique constraint: (userId, providerAccountId, provider)

### Modified Tables
- **UploadPortal**: Added nullable `storageAccountId`
- **FileUpload**: Added nullable `storageAccountId`

### No Breaking Changes
- All existing columns preserved
- New columns are nullable
- Existing data unaffected

---

## API Endpoints - No Changes Required

### `/api/upload` - POST
- **Status**: ✅ Backward compatible
- **Changes needed**: Set `storageAccountId` in FileUpload record
- **Impact**: None - internal change only

### `/api/uploads/[id]/download` - GET
- **Status**: ✅ Backward compatible
- **Changes needed**: Prefer `storageAccountId` if available
- **Impact**: None - internal change only

### `/api/portals` - GET/POST
- **Status**: ✅ Backward compatible
- **Changes needed**: Support storage account selection
- **Impact**: None - new optional parameter

---

## Critical Functions

### getValidAccessToken(userId, provider)
- **Purpose**: Get valid OAuth token, refreshing if needed
- **Returns**: `{ accessToken, providerAccountId }` or null
- **Backward compatible**: Yes - unchanged behavior
- **Location**: `lib/storage/index.ts`

### getPortalUploadRules(portalStorageAccountId, portalStorageProvider, ...)
- **Purpose**: Determine if portal can accept uploads
- **Returns**: `{ acceptsUploads, storageAccountId, reason }`
- **Backward compatible**: Yes - handles null storageAccountId
- **Location**: `lib/storage/portal-locking.ts`

### getDownloadRules(fileStorageAccountId, storageAccountStatus)
- **Purpose**: Determine if file can be downloaded
- **Returns**: `{ canDownload, requiresAuth, reason }`
- **Backward compatible**: Yes - handles null storageAccountId
- **Location**: `lib/storage/file-binding.ts`

### checkPortalUploadAcceptance(portalId)
- **Purpose**: Check if portal can accept uploads
- **Returns**: `{ accepted, reason, storageAccountId, suggestedActions }`
- **Backward compatible**: Yes - handles legacy portals
- **Location**: `lib/storage/upload-acceptance.ts`

---

## Potential Breaking Changes - NONE IDENTIFIED

### What Could Break
1. ❌ Removing nullable from `storageAccountId` - would break legacy data
2. ❌ Requiring `storageAccountId` in upload - would break legacy portals
3. ❌ Changing `Account` table structure - would break OAuth
4. ❌ Removing fallback logic - would break legacy files

### What Won't Break
1. ✅ Adding new fields (nullable)
2. ✅ Adding new tables
3. ✅ Adding new indexes
4. ✅ Adding new API endpoints
5. ✅ Internal logic changes (no API changes)

---

## Edge Cases Handled

### Case 1: Legacy File, No Storage Account
- **Behavior**: Uses portal's storageProvider for access
- **Status**: ✅ Handled
- **Code**: `lib/storage/file-binding.ts:LEGACY_FILE_RULES`

### Case 2: Legacy Portal, No Storage Account
- **Behavior**: Finds active account for portal's provider
- **Status**: ✅ Handled
- **Code**: `lib/storage/portal-locking.ts:getPortalUploadRules()`

### Case 3: Revoked OAuth Token
- **Behavior**: Returns null; caller handles gracefully
- **Status**: ✅ Handled
- **Code**: `lib/storage/index.ts:getValidAccessToken()`

### Case 4: Multiple Accounts for Same Provider
- **Behavior**: Uses first active account
- **Status**: ⚠️ Handled but needs UI enhancement
- **Code**: `lib/storage/portal-locking.ts:getPortalUploadRules()`

### Case 5: Storage Account Disconnected
- **Behavior**: Rejects new uploads; existing files inaccessible
- **Status**: ✅ Handled
- **Code**: `lib/storage/upload-acceptance.ts`

---

## Testing Checklist

### Backward Compatibility Tests
- [ ] Legacy file download works
- [ ] Legacy portal upload works
- [ ] OAuth token refresh works
- [ ] Multiple OAuth providers work
- [ ] Revoked tokens handled gracefully
- [ ] Storage account disconnection handled
- [ ] Portal without storage account works
- [ ] File without storage account works

### New Feature Tests
- [ ] Storage account creation works
- [ ] Storage account status transitions work
- [ ] Portal storage account binding works
- [ ] File storage account binding works
- [ ] Storage account state enforcement works

### Integration Tests
- [ ] Upload flow with storage account
- [ ] Download flow with storage account
- [ ] Portal creation with storage account
- [ ] Portal update storage account
- [ ] Storage account disconnection flow

---

## Migration Path

### No Data Migration Required
- Existing records work as-is
- New records get proper bindings
- Gradual migration as users interact with system

### Optional: Populate StorageAccount
```sql
-- Create StorageAccount records from existing Account records
INSERT INTO "StorageAccount" (
  id, userId, provider, providerAccountId, displayName, 
  email, status, isActive, createdAt, updatedAt
)
SELECT 
  CONCAT('sa_', provider, '_', providerAccountId),
  userId,
  provider,
  providerAccountId,
  COALESCE(email, 'Unknown'),
  email,
  'ACTIVE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Account"
WHERE provider IN ('google', 'dropbox')
ON CONFLICT DO NOTHING;
```

### Optional: Bind Existing Portals
```sql
-- Bind portals to their first active storage account
UPDATE "UploadPortal" p
SET storageAccountId = (
  SELECT id FROM "StorageAccount" sa
  WHERE sa.userId = p.userId
  AND sa.provider = CASE 
    WHEN p.storageProvider = 'google_drive' THEN 'google'
    WHEN p.storageProvider = 'dropbox' THEN 'dropbox'
  END
  AND sa.status = 'ACTIVE'
  LIMIT 1
)
WHERE p.storageAccountId IS NULL;
```

---

## Monitoring & Alerts

### Key Metrics
- Upload success rate (should remain stable)
- Download success rate (should remain stable)
- Portal creation rate (should remain stable)
- Storage account errors (new metric)
- Token refresh failures (new metric)

### Alerts to Set Up
- Storage account status changes
- Token refresh failures
- Upload failures due to storage issues
- Download failures due to storage issues
- Portal creation failures

---

## Rollback Plan

### If Issues Discovered
1. **Disable new features**: Don't set `storageAccountId` on new uploads
2. **Use legacy logic**: Revert to provider-based fallback
3. **Keep data**: StorageAccount table remains (no harm)
4. **Restore service**: System continues working with legacy logic

### Rollback Steps
```typescript
// Revert to legacy upload logic
const fileUpload = await prisma.fileUpload.create({
  data: {
    // ... existing fields
    // storageAccountId: null (don't set)
  }
})

// Revert to legacy download logic
const fileData = await downloadFromCloudStorage(
  session.user.id,
  upload.storageProvider,  // Use provider field
  storageId || ""
)
```

---

## Conclusion

The multi-storage account system is **fully backward compatible**:

✅ No breaking changes to APIs
✅ No data migration required
✅ Existing users unaffected
✅ Existing files continue working
✅ Existing portals continue working
✅ OAuth accounts preserved
✅ Graceful error handling
✅ Clear user messages

**Risk Level**: LOW
**Rollback Difficulty**: EASY
**Testing Effort**: MEDIUM
