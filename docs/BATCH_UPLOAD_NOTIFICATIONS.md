# Batch Upload Notifications

This document explains the batch upload notification system that sends a single email after all files in a batch are uploaded, rather than individual emails for each file.

## Overview

The batch upload system allows clients to upload multiple files and receive a single consolidated email notification when all files are complete, instead of receiving separate emails for each file.

## How It Works

### 1. Batch Session Creation

Before uploading multiple files, create a batch session:

```javascript
// Create batch session
const response = await fetch('/api/upload/batch/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    portalId: 'portal-123',
    fileCount: 3, // Number of files to upload
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    clientMessage: 'Project files for review',
    token: 'password-token-if-required'
  })
})

const { batchId } = await response.json()
```

### 2. File Uploads with Batch ID

Include the `batchId` in each file upload:

```javascript
// Upload each file with the batch ID
const formData = new FormData()
formData.append('file', file)
formData.append('portalId', 'portal-123')
formData.append('batchId', batchId) // Include batch ID
formData.append('clientName', 'John Doe')
// ... other fields

await fetch('/api/upload', {
  method: 'POST',
  body: formData
})
```

### 3. Automatic Notification

When the last file in the batch is uploaded:
- The system detects the batch is complete
- A single email notification is sent with all file details
- Individual file notifications are suppressed

## API Endpoints

### Create Batch Session

**POST** `/api/upload/batch/init`

```json
{
  "portalId": "string",
  "fileCount": "number",
  "clientName": "string (optional)",
  "clientEmail": "string (optional)", 
  "clientMessage": "string (optional)",
  "token": "string (if portal is password protected)"
}
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch_1234567890_abc123",
  "portalId": "portal-123",
  "fileCount": 3,
  "message": "Batch upload session created for 3 files"
}
```

### Check Batch Status

**GET** `/api/upload/batch/status?batchId=batch_1234567890_abc123`

**Response:**
```json
{
  "success": true,
  "batchId": "batch_1234567890_abc123",
  "portalId": "portal-123",
  "expectedFileCount": 3,
  "uploadedFileCount": 2,
  "isComplete": false,
  "progress": 67,
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-01-15T11:00:00Z"
}
```

## Upload Endpoints (Modified)

All existing upload endpoints now support the optional `batchId` parameter:

- **POST** `/api/upload` - Standard upload
- **POST** `/api/upload/complete` - Resumable upload completion
- **POST** `/api/upload/chunked/complete` - Chunked upload completion

## Email Templates

### Individual Upload (Legacy)
When no `batchId` is provided, the system sends individual notifications using the existing `UploadNotificationEmail` template.

### Batch Upload
When a batch is complete, the system sends a consolidated notification using the new `BatchUploadNotificationEmail` template that includes:

- Total number of files uploaded
- List of file names (up to 5 shown, then "and X more files")
- Combined file size
- Single upload timestamp
- Client information
- Portal details

## Implementation Details

### Storage
- Batch sessions are stored in Redis with 30-minute expiration
- Session data includes expected file count and uploaded file IDs
- Automatic cleanup prevents memory leaks

### Tracking
- Each file upload checks if it belongs to a batch
- When added to batch, system checks if batch is complete
- Complete batches trigger email notification and cleanup

### Error Handling
- Expired batch sessions fall back to individual notifications
- Missing batch sessions don't block uploads
- Failed email notifications are logged but don't affect uploads

## Client Implementation Example

```javascript
class BatchUploader {
  constructor(portalId, files, clientInfo) {
    this.portalId = portalId
    this.files = files
    this.clientInfo = clientInfo
    this.batchId = null
  }

  async upload() {
    // 1. Create batch session
    const batchResponse = await fetch('/api/upload/batch/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalId: this.portalId,
        fileCount: this.files.length,
        ...this.clientInfo
      })
    })
    
    const { batchId } = await batchResponse.json()
    this.batchId = batchId

    // 2. Upload all files with batch ID
    const uploadPromises = this.files.map(file => this.uploadFile(file))
    await Promise.all(uploadPromises)

    console.log('All files uploaded! Single email notification sent.')
  }

  async uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('portalId', this.portalId)
    formData.append('batchId', this.batchId)
    formData.append('clientName', this.clientInfo.clientName)
    formData.append('clientEmail', this.clientInfo.clientEmail)
    formData.append('clientMessage', this.clientInfo.clientMessage)

    return fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
  }
}

// Usage
const uploader = new BatchUploader('portal-123', files, {
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  clientMessage: 'Project files'
})

await uploader.upload()
```

## Maintenance

### Cleanup Script
Run periodically to clean up expired batch sessions:

```bash
npm run cleanup-batch-sessions
```

### Cron Job Setup
```bash
# Clean up expired batch sessions every hour
0 * * * * cd /path/to/project && npm run cleanup-batch-sessions
```

### Monitoring
- Batch creation and completion are logged with detailed information
- Failed email notifications are logged for debugging
- Redis keys use `batch:*` pattern for easy monitoring

## Backward Compatibility

The system is fully backward compatible:
- Uploads without `batchId` work exactly as before
- Existing clients receive individual notifications
- No changes required for single-file uploads

## Configuration

### Environment Variables
```env
# Redis connection (required for batch tracking)
REDIS_URL=redis://localhost:6379

# Email service (existing)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="SecureUploadHub <noreply@yourdomain.com>"

# Application URLs (existing)
NEXTAUTH_URL="https://yourdomain.com"
```

### Batch Session Settings
- **Expiration**: 30 minutes (configurable in code)
- **Storage**: Redis with automatic expiration
- **Cleanup**: Manual script or cron job

## Troubleshooting

### Common Issues

1. **Batch not completing**
   - Check if all files were uploaded successfully
   - Verify batch session hasn't expired (30 minutes)
   - Check Redis connectivity

2. **Individual emails still being sent**
   - Ensure `batchId` is included in all upload requests
   - Verify batch session was created successfully
   - Check for upload errors that might bypass batch logic

3. **No email notification**
   - Check if batch was marked as complete in logs
   - Verify email service configuration
   - Check portal owner has valid email address

### Debug Commands

```bash
# Check Redis for active batch sessions
redis-cli KEYS "batch:*"

# Get batch session details
redis-cli GET "batch:batch_1234567890_abc123"

# Monitor batch operations in logs
tail -f logs/app.log | grep "BATCH_"
```

## Performance Considerations

- Batch sessions use minimal Redis memory
- Automatic expiration prevents memory leaks
- Email consolidation reduces email service load
- No impact on upload performance or reliability