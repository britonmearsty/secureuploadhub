# Cascade File Deletion Implementation

## Overview

This implementation provides cascade deletion functionality to maintain data consistency between the application database and cloud storage providers (Google Drive and Dropbox). When files are deleted from cloud storage, the corresponding database records are automatically cleaned up.

## Features

### 1. Enhanced Delete API (`/api/uploads/[id]`)

The existing delete endpoint now uses `deleteFromCloudStorageWithCascade()` which:
- Attempts to delete the file from cloud storage
- Automatically removes the database record
- Handles cases where the file is already deleted from cloud storage
- Provides detailed logging and error handling

### 2. Cascade Deletion Function

**Function:** `deleteFromCloudStorageWithCascade()`
**Location:** `lib/storage/index.ts`

**Parameters:**
- `userId`: User ID for authentication
- `provider`: Storage provider ("google_drive" or "dropbox")
- `fileId`: Cloud storage file ID
- `databaseFileId`: (optional) Database record ID for direct deletion

**Returns:**
```typescript
{
  success: boolean
  error?: string
  deletedFromCloud: boolean
  deletedFromDatabase: boolean
}
```

**Behavior:**
1. Attempts to delete from cloud storage
2. If cloud deletion fails due to "file not found", continues with database cleanup
3. Removes database record either by provided ID or by searching for storage file ID
4. Returns detailed status of both operations

### 3. Cleanup API (`/api/storage/cleanup`)

**Endpoint:** `POST /api/storage/cleanup`

**Purpose:** Find and remove orphaned database records (files that exist in database but not in cloud storage)

**Parameters:**
```json
{
  "provider": "google_drive" | "dropbox",
  "dryRun": boolean (default: true)
}
```

**Features:**
- **Dry Run Mode:** Identifies orphaned files without deleting them
- **Real Cleanup Mode:** Actually removes orphaned database records
- Checks each file's existence in cloud storage
- Provides detailed reporting of found and cleaned files

### 4. Debug Interface (`/debug-cleanup`)

A user-friendly interface to:
- Test cleanup functionality for both providers
- Run dry runs to see what would be cleaned
- Execute real cleanup operations
- View detailed results and statistics

## Enhanced Provider Services

### Google Drive Service
- `deleteFile()` now treats 404 responses as successful (file already gone)
- Better error handling and reporting

### Dropbox Service  
- `deleteFile()` handles `path_not_found` errors as successful
- Improved error messages for permission issues

## Usage Examples

### 1. Delete File via API (with cascade)
```typescript
// DELETE /api/uploads/[fileId]
// Automatically handles both cloud and database deletion
```

### 2. Manual Cascade Deletion
```typescript
import { deleteFromCloudStorageWithCascade } from "@/lib/storage"

const result = await deleteFromCloudStorageWithCascade(
  userId,
  "google_drive",
  "cloud-file-id",
  "database-record-id"
)

console.log(result)
// {
//   success: true,
//   deletedFromCloud: true,
//   deletedFromDatabase: true
// }
```

### 3. Cleanup Orphaned Records
```typescript
// Check for orphaned files (dry run)
const response = await fetch('/api/storage/cleanup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google_drive',
    dryRun: true
  })
})

// Clean up orphaned files (real)
const cleanupResponse = await fetch('/api/storage/cleanup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google_drive',
    dryRun: false
  })
})
```

## Error Handling

The implementation handles several scenarios:

1. **File not found in cloud storage:** Continues with database cleanup
2. **Database record not found:** Logs warning but doesn't fail
3. **Authentication errors:** Stops operation and reports error
4. **Network/API errors:** Retries where appropriate, logs detailed errors

## Benefits

1. **Data Consistency:** Prevents orphaned database records
2. **Storage Efficiency:** Removes references to non-existent files
3. **User Experience:** Files deleted from cloud storage don't appear as "unavailable"
4. **Maintenance:** Provides tools to clean up existing inconsistencies

## Testing

Use the debug interface at `/debug-cleanup` to:
1. Test the cleanup functionality safely with dry runs
2. Identify orphaned files before cleanup
3. Monitor cleanup operations and results
4. Verify the system is working correctly

## Logging

All operations include detailed logging:
- Cloud storage deletion attempts and results
- Database cleanup operations
- Error conditions and recovery actions
- File identification and matching logic

Check server logs for detailed operation traces.