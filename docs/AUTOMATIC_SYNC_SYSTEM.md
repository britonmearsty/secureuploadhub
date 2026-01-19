# Automatic Sync System

This document describes the automatic syncing system that replaces manual sync buttons in the portals interface.

## Overview

The system automatically syncs storage accounts to remove files from the database that have been deleted from cloud storage (Google Drive or Dropbox). This ensures the file list in the application stays in sync with the actual files in cloud storage.

## How It Works

### 1. User-Level Automatic Sync

When users access their dashboard or portals page, the system automatically triggers a background sync for their account. This happens:

- **On Dashboard Load**: When users visit `/dashboard`
- **On Portals Page Load**: When users visit `/dashboard/portals`
- **On Assets Page Load**: When users visit `/dashboard/assets`
- **On Client Modal Open**: When users open client details in `/dashboard/clients`
- **Silently**: No UI feedback is shown to avoid interrupting the user experience

### 2. Background Sync Service

A background service runs every 6 hours to sync all users who have auto-sync enabled:

- **Schedule**: Every 6 hours (0 */6 * * *)
- **Scope**: All users with `autoSync: true` in their sync settings
- **Method**: Vercel Cron Job calling `/api/storage/background-sync`

### 3. Sync Settings

Each user has sync settings stored in the `SyncSettings` table:

```typescript
{
  autoSync: boolean        // Default: true
  deleteAfterSync: boolean // Default: false (not used currently)
  syncInterval: number     // Default: 3600 seconds (1 hour)
}
```

## API Endpoints

### `/api/storage/user-sync` (POST)

Syncs the current authenticated user's storage accounts.

**Authentication**: Requires valid session
**Response**: 
```json
{
  "success": true,
  "message": "User sync completed",
  "syncedFiles": 150,
  "deletedFiles": 3,
  "results": [
    {
      "provider": "google_drive",
      "synced": 100,
      "deleted": 2
    },
    {
      "provider": "dropbox", 
      "synced": 50,
      "deleted": 1
    }
  ]
}
```

### `/api/storage/background-sync` (POST)

Syncs all users with auto-sync enabled. Used by cron jobs.

**Authentication**: Requires `CRON_SECRET` in Authorization header or `x-vercel-cron-secret` header
**Response**:
```json
{
  "success": true,
  "message": "Background sync completed",
  "stats": {
    "usersProcessed": 25,
    "filesSynced": 1500,
    "filesDeleted": 12,
    "errors": 0
  },
  "errors": []
}
```

## Sync Process

For each storage provider (Google Drive, Dropbox):

1. **Get User Files**: Fetch all files for the provider from the database
2. **Check Storage Connection**: Verify OAuth token is valid
3. **Verify File Existence**: For each file, check if it still exists in cloud storage
4. **Mark Orphaned Files**: Files that don't exist in cloud storage are marked for deletion
5. **Delete from Database**: Remove orphaned files from the database
6. **Invalidate Caches**: Clear relevant caches to reflect changes

## Error Handling

- **API Errors**: If cloud storage APIs are unavailable, files are not marked as orphaned
- **Token Issues**: If OAuth tokens are invalid, the provider is skipped
- **Network Errors**: Sync continues with other providers/users
- **Silent Failures**: User-level sync fails silently to avoid interrupting UX

## Configuration

### Environment Variables

- `CRON_SECRET`: Secret key for authenticating cron job requests

### Vercel Configuration

```json
{
  "crons": [
    {
      "path": "/api/storage/background-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Manual Execution

You can manually trigger syncing using the provided scripts:

```bash
# Sync all users
npx tsx scripts/background-sync.ts

# Or via API call
curl -X POST https://your-domain.com/api/storage/background-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Benefits

1. **Automatic**: No manual intervention required
2. **Silent**: Doesn't interrupt user experience
3. **Efficient**: Only processes users with auto-sync enabled
4. **Reliable**: Multiple sync triggers ensure consistency
5. **Scalable**: Background service handles all users efficiently

## Migration from Manual Sync

The manual sync buttons have been removed from:
- `components/assets/FileList.tsx`
- `app/dashboard/assets/AssetsClient.tsx`
- `app/dashboard/clients/ClientsClient.tsx`
- Portal detail modals
- Client detail modals
- File management interfaces

Users no longer need to manually sync their storage accounts as this happens automatically in the background.