# Storage Account Architecture - Complete Index

**Last Updated:** January 16, 2026  
**Purpose:** Comprehensive documentation of the storage account system, from database to UI

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Core Components](#core-components)
4. [File Upload Flow](#file-upload-flow)
5. [Portal Management](#portal-management)
6. [Storage Account States](#storage-account-states)
7. [API Endpoints](#api-endpoints)
8. [UI Components](#ui-components)
9. [Key Files Reference](#key-files-reference)

---

## System Overview

The storage account system manages cloud storage integrations (Google Drive, Dropbox) with a focus on:
- **Permanent file binding** to storage accounts
- **Portal-based upload management**
- **OAuth token management** and refresh
- **State-based access control** (ACTIVE, INACTIVE, DISCONNECTED, ERROR)
- **Automatic portal deactivation/reactivation** based on storage account status

### Key Principles

1. **Files are permanently bound to storage accounts** - Once uploaded, a file's `storageAccountId` never changes
2. **Portals are bound to storage accounts** - Each portal uses a specific storage account for uploads
3. **Storage account states control access** - Files become inaccessible when storage account is DISCONNECTED or ERROR
4. **OAuth and storage are separate** - OAuth accounts (for login) vs StorageAccounts (for file storage)

---

## Database Schema

### StorageAccount Model
```prisma
model StorageAccount {
  id                String              @id @default(cuid())
  userId            String
  provider          String              // "google_drive", "dropbox"
  providerAccountId String              // External account ID from OAuth
  displayName       String              // User-friendly name
  email             String?             // Account email
  status            StorageAccountStatus @default(ACTIVE)
  isActive          Boolean             @default(true)    // DEPRECATED
  lastError         String?
  lastAccessedAt    DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  user              User         @relation(...)
  portals           UploadPortal[]
  fileUploads       FileUpload[]
  
  @@unique([userId, providerAccountId, provider])
}

enum StorageAccountStatus {
  ACTIVE      // Can create uploads, fully functional
  INACTIVE    // Cannot create uploads, existing data accessible
  DISCONNECTED // OAuth revoked, data inaccessible
  ERROR       // Connection issues, temporary state
}
```

### UploadPortal Model
```prisma
model UploadPortal {
  id                  String          @id @default(cuid())
  userId              String
  name                String
  slug                String          @unique
  storageProvider     String          @default("local") // DEPRECATED
  storageAccountId    String?         // PRIMARY: Bind to specific storage account
  storageFolderId     String?
  storageFolderPath   String?
  // ... other portal fields
  
  storageAccount      StorageAccount? @relation(...)
  uploads             FileUpload[]
}
```

### FileUpload Model
```prisma
model FileUpload {
  id              String       @id @default(cuid())
  portalId        String
  userId          String?
  fileName        String
  fileSize        Int
  storageProvider String       // DEPRECATED
  storageFileId   String?
  storagePath     String?
  storageAccountId String?     // PRIMARY: Permanently bind to storage account
  status          String       @default("pending")
  // ... other fields
  
  portal          UploadPortal @relation(...)
  storageAccount  StorageAccount? @relation(...)
}
```

---

## Core Components

### 1. Storage Account Manager
**File:** `lib/storage/storage-account-manager.ts`

Central manager for storage account operations with race condition protection:

```typescript
class StorageAccountManager {
  // Create or get storage account with locking
  static async createOrGetStorageAccount(
    userId: string,
    account: { provider: string, providerAccountId: string },
    userEmail: string | null,
    userName: string | null,
    options?: { forceCreate?: boolean, respectDisconnected?: boolean }
  ): Promise<StorageAccountCreationResult>
  
  // Ensure all OAuth accounts have StorageAccounts
  static async ensureStorageAccountsForUser(
    userId: string,
    options?: { forceCreate?: boolean, respectDisconnected?: boolean }
  ): Promise<{
    created: number
    reactivated: number
    validated: number
    errors: string[]
  }>
}
```

**Features:**
- Distributed locking (in-memory)
- Idempotency protection
- Automatic creation from OAuth accounts
- Reactivation of DISCONNECTED accounts

### 2. Cloud Storage Service
**File:** `lib/storage/index.ts`

Main entry point for cloud storage operations:

```typescript
// Get valid access token (with auto-refresh)
async function getValidAccessToken(
  userId: string,
  provider: "google" | "dropbox",
  providerAccountId?: string
): Promise<{ accessToken: string; providerAccountId: string } | null>

// Upload file to cloud storage
async function uploadToCloudStorage(
  userId: string,
  provider: StorageProvider,
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string,
  folderPath?: string
): Promise<UploadResult>

// Download file from cloud storage
async function downloadFromCloudStorage(
  userId: string,
  provider: StorageProvider,
  fileId: string
): Promise<{ data?: Buffer; mimeType?: string; fileName?: string } | null>

// Delete file from cloud storage
async function deleteFromCloudStorage(
  userId: string,
  provider: StorageProvider,
  fileId: string
): Promise<void>

// Delete with cascade (cloud + database)
async function deleteFromCloudStorageWithCascade(
  userId: string,
  provider: StorageProvider,
  fileId: string,
  databaseFileId?: string
): Promise<{
  success: boolean
  deletedFromCloud: boolean
  deletedFromDatabase: boolean
}>
```

**Features:**
- Automatic token refresh
- Storage account status updates on token failure
- Provider-specific service routing (Google Drive, Dropbox)
- Cascade deletion support

### 3. File Binding Rules
**File:** `lib/storage/file-binding.ts`

Defines how files are permanently bound to storage accounts:

```typescript
// Determine upload eligibility and storage account binding
function getUploadRules(
  portalStorageAccountId: string | null,
  portalStorageProvider: string,
  userStorageAccounts: Array<{
    id: string
    provider: string
    status: StorageAccountStatus
  }>
): UploadFlowRules

// Determine download eligibility based on storage account state
function getDownloadRules(
  fileStorageAccountId: string | null,
  storageAccountStatus: StorageAccountStatus | null
): DownloadFlowRules
```

**Key Rules:**
- Files inherit storage account from portal at upload time
- If portal has no storage account, use user's active account for that provider
- Binding is set once and never changes (immutable)
- Files with DISCONNECTED accounts cannot be accessed
- Files with INACTIVE accounts can still be accessed

### 4. Portal Management
**File:** `lib/storage/portal-management.ts`

Handles automatic portal deactivation/reactivation:

```typescript
// Deactivate portals when storage account becomes inactive
async function deactivatePortalsForStorageAccount(
  storageAccountId: string,
  reason?: string
): Promise<PortalManagementResult>

// Reactivate portals when storage account becomes active
async function reactivatePortalsForStorageAccount(
  storageAccountId: string,
  reason?: string
): Promise<PortalManagementResult>

// Handle portal management when storage account status changes
async function handleStorageAccountStatusChange(
  storageAccountId: string,
  oldStatus: StorageAccountStatus,
  newStatus: StorageAccountStatus,
  reason?: string
): Promise<PortalManagementResult>
```

**Features:**
- Automatic portal deactivation when storage becomes unavailable
- Automatic reactivation when storage becomes available again
- Audit logging for all automatic actions
- Only reactivates portals that were auto-deactivated (not manually deactivated)

### 5. Portal Creation & Locking
**Files:** `lib/storage/portal-creation.ts`, `lib/storage/portal-locking.ts`

Enforces portal storage binding rules:

```typescript
// Validate portal creation with storage account requirements
async function validatePortalCreationWithStorage(
  userId: string,
  storageProvider: string,
  selectedStorageAccountId?: string
): Promise<{
  success: boolean
  storageAccountId?: string
  error?: string
}>

// Create portal with proper storage account binding
async function createPortalWithStorageBinding(data: {
  userId: string
  name: string
  slug: string
  storageProvider: string
  storageAccountId: string
  // ... other portal fields
})

// Get portal upload acceptance status
async function getPortalUploadAcceptance(
  portalId: string
): Promise<{
  acceptsUploads: boolean
  reason?: string
  storageAccountId?: string
  requiresUserAction?: boolean
}>
```

**Portal Binding Rules:**
- Portal must be bound to a storage account at creation
- Only ACTIVE storage accounts can be selected
- Portal binding persists even if account becomes INACTIVE/DISCONNECTED
- Users can manually change portal's storage account
- Change affects future uploads only, not existing files

---

## File Upload Flow

### Complete Upload Process

**File:** `app/api/upload/route.ts`

```
1. VALIDATION
   ├─ Portal exists and is active
   ├─ Password verification (if required)
   ├─ Client info validation
   ├─ File size validation
   └─ File type validation

2. STORAGE ACCOUNT RESOLUTION
   ├─ Get user's storage accounts
   ├─ Apply upload rules (getUploadRules)
   ├─ Determine storage account to use
   └─ Fail if no valid storage account

3. BILLING CHECK
   └─ assertUploadAllowed(userId, fileSize)

4. SECURITY SCAN
   ├─ Skip for safe types (image/jpeg, image/png, etc.)
   ├─ Scan potentially dangerous files
   └─ Reject if malware detected

5. CLOUD UPLOAD
   ├─ Generate unique filename
   ├─ Determine folder path (client folders if enabled)
   ├─ uploadToCloudStorage()
   └─ Get storageFileId and storagePath

6. DATABASE RECORD
   ├─ Create FileUpload record
   ├─ Set storageAccountId (PERMANENT BINDING)
   ├─ Set storageFileId and storagePath
   └─ Set status to "uploaded"

7. FINALIZATION
   ├─ Invalidate caches
   ├─ Send email notification (async)
   └─ Return success response
```

### Upload Rules Logic

```typescript
// From lib/storage/file-binding.ts

Rule 1: Portal has storage account
  ├─ Check if account exists in user's accounts
  ├─ Check if account status allows uploads (ACTIVE)
  └─ Use portal's storage account

Rule 2: Portal has no storage account
  ├─ Find active account for portal's provider
  └─ Use that account

Rule 3: Fallback
  ├─ Find any active account
  └─ Use that account

Rule 4: No active accounts
  └─ Fail upload with error message
```

---

## Portal Management

### Portal States and Storage

**Portal Operational Status:**

```typescript
// From lib/storage/portal-locking.ts

ACTIVE Storage Account:
  ├─ Portal is fully operational
  ├─ Can accept new uploads
  ├─ Can access existing files
  └─ No user action required

INACTIVE Storage Account:
  ├─ Portal shows inactive status
  ├─ Cannot accept new uploads
  ├─ Can still access existing files
  └─ User can reactivate or change storage account

DISCONNECTED Storage Account:
  ├─ Portal shows disconnected status
  ├─ Cannot accept new uploads
  ├─ Cannot access existing files
  └─ User must reconnect or change storage account

ERROR Storage Account:
  ├─ Portal shows error status
  ├─ Cannot accept new uploads
  ├─ Cannot access existing files
  ├─ System may auto-retry
  └─ User can retry or change storage account
```

### Portal Creation Flow

**File:** `lib/storage/portal-creation.ts`

```
1. VALIDATION
   ├─ User must have at least one storage account for provider
   ├─ Must have at least one ACTIVE account
   └─ If specific account selected, must be ACTIVE

2. STORAGE ACCOUNT BINDING
   ├─ Verify storage account belongs to user
   ├─ Verify storage account is ACTIVE
   ├─ Verify provider consistency
   └─ Set storageAccountId in portal

3. PORTAL CREATION
   ├─ Create UploadPortal record
   ├─ Set storageAccountId (binding)
   └─ Log portal creation with storage binding

4. AUDIT
   └─ Create audit log entry
```

---

## Storage Account States

### State Definitions

**File:** `lib/storage/account-states.ts`

```typescript
enum StorageAccountStatus {
  ACTIVE      // Can create uploads, fully functional
  INACTIVE    // Cannot create uploads, existing data accessible
  DISCONNECTED // OAuth revoked, data inaccessible
  ERROR       // Connection issues, temporary state
}

// Check if storage account can create new uploads
function canCreateUploads(status: StorageAccountStatus): boolean {
  return status === StorageAccountStatus.ACTIVE
}

// Check if storage account can access existing files
function canAccessFiles(status: StorageAccountStatus): boolean {
  return status === StorageAccountStatus.ACTIVE || 
         status === StorageAccountStatus.INACTIVE
}
```

### State Transitions

```
ACTIVE ──────────────────────────────────────────────────────┐
  │                                                            │
  │ User deactivates                                           │ User reactivates
  │                                                            │
  ├──> INACTIVE                                                │
  │      │                                                     │
  │      │ User deactivates                                    │
  │      │                                                     │
  │      └──> DISCONNECTED <──────────────────────────────────┘
  │             │
  │             │ OAuth token refresh fails
  │             │ User revokes OAuth access
  │             │
  │             └──> (stays DISCONNECTED)
  │
  │ Connection error
  │ Token refresh fails temporarily
  │
  └──> ERROR
         │
         │ Auto-retry succeeds
         │
         └──> ACTIVE
```

### State Impact on Portals

```
Storage Account State Change:
  │
  ├─ ACTIVE → INACTIVE/DISCONNECTED/ERROR
  │    └─> Deactivate all portals using this storage account
  │
  └─ INACTIVE/DISCONNECTED/ERROR → ACTIVE
       └─> Reactivate portals that were auto-deactivated
```

---

## API Endpoints

### Storage Account Management

#### GET /api/storage/accounts
Get connected storage accounts with OAuth and storage status

**Response:**
```json
{
  "accounts": [
    {
      "provider": "google",
      "providerAccountId": "...",
      "email": "user@example.com",
      "name": "User Name",
      "isConnected": true,
      "storageAccountId": "...",
      "storageStatus": "ACTIVE",
      "isAuthAccount": true,
      "hasValidOAuth": true
    }
  ]
}
```

#### GET /api/v1/storage
Enhanced storage accounts endpoint with fallback mechanism

**Response:**
```json
{
  "accounts": [...],
  "activeStorageAccounts": [...],
  "fallbackInfo": {
    "accountsCreated": 0,
    "accountsReactivated": 0,
    "accountsValidated": 2,
    "errors": []
  }
}
```

#### POST /api/storage/deactivate
Deactivate a storage account

**Request:**
```json
{
  "provider": "google_drive"
}
```

**Response:**
```json
{
  "message": "Storage account deactivated successfully",
  "deactivatedPortals": 2
}
```

#### POST /api/storage/reactivate
Reactivate a storage account

**Request:**
```json
{
  "provider": "google_drive"
}
```

**Response:**
```json
{
  "message": "Storage account reactivated successfully",
  "reactivatedPortals": 2
}
```

#### POST /api/storage/fix-accounts
Create missing storage accounts from OAuth accounts

**Response:**
```json
{
  "message": "Storage accounts fixed successfully",
  "summary": {
    "created": 1,
    "reactivated": 0,
    "validated": 1,
    "errors": [],
    "reactivatedPortals": 0
  }
}
```

#### POST /api/storage/sync-oauth-status
Sync storage account status with OAuth status

**Response:**
```json
{
  "message": "Storage accounts synced successfully",
  "summary": {
    "deactivatedPortals": 0,
    "reactivatedPortals": 2
  }
}
```

### Upload Endpoints

#### POST /api/upload
Upload a file to a portal

**Request:** FormData
- `file`: File
- `portalId`: string
- `clientName`: string (optional)
- `clientEmail`: string (optional)
- `clientMessage`: string (optional)
- `token`: string (if password protected)

**Response:**
```json
{
  "success": true,
  "uploadId": "...",
  "fileName": "example.pdf",
  "storageProvider": "google_drive"
}
```

#### GET /api/uploads/[id]/download
Download a file

**Response:** File stream or error

#### DELETE /api/uploads/[id]
Delete a file (cloud + database)

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Portal Endpoints

#### GET /api/portals
Get user's portals

**Response:**
```json
[
  {
    "id": "...",
    "name": "Client Portal",
    "slug": "client-portal",
    "storageProvider": "google_drive",
    "storageAccountId": "...",
    "isActive": true,
    "_count": {
      "uploads": 42
    }
  }
]
```

#### POST /api/portals
Create a new portal

**Request:**
```json
{
  "name": "New Portal",
  "slug": "new-portal",
  "storageProvider": "google_drive",
  "storageAccountId": "...",
  "requireClientName": true,
  "requireClientEmail": false
}
```

---

## UI Components

### Connected Accounts Component
**File:** `app/dashboard/settings/components/ConnectedAccounts.tsx`

Displays and manages storage accounts:

**Features:**
- Shows OAuth status (hasValidOAuth)
- Shows storage account status (ACTIVE, INACTIVE, DISCONNECTED, ERROR)
- Connect/Disconnect buttons
- Reactivate button for INACTIVE accounts
- Fix Storage button (creates missing StorageAccounts)
- Sync OAuth Status button

**Account Display:**
```tsx
{accounts.map(account => (
  <div>
    <h3>{account.provider}</h3>
    <p>OAuth: {account.hasValidOAuth ? '✅' : '❌'}</p>
    <p>Storage: {account.storageStatus}</p>
    <p>Connected: {account.isConnected ? '✅' : '❌'}</p>
    {/* Action buttons based on status */}
  </div>
))}
```

### Storage Status Indicator
**File:** `lib/storage-utils.tsx`

Visual indicator for storage account status:

```tsx
function getStorageStatusIndicator(storageAccount?: StorageAccount | null) {
  // Returns colored dot + text based on status:
  // - ACTIVE: Green dot + "Connected"
  // - INACTIVE: Yellow dot + "Inactive"
  // - DISCONNECTED: Red dot + "Unavailable"
  // - ERROR: Orange dot + "Unavailable"
  // - null: Gray dot + "Legacy"
}
```

### Dashboard Pages

#### Settings Page
**File:** `app/dashboard/settings/page.tsx`
- Profile settings
- Connected accounts management
- Notification preferences

#### Portals Page
**File:** `app/dashboard/portals/page.tsx`
- List of user's portals
- Create new portal
- Portal status indicators
- Upload counts

#### Files Page
**File:** `app/dashboard/files/page.tsx`
- List of uploaded files
- Storage account status for each file
- Download/delete actions
- Filter by portal, client, etc.

---

## Key Files Reference

### Core Storage Files

```
lib/storage/
├── index.ts                      # Main entry point, cloud storage operations
├── storage-account-manager.ts    # Central manager with locking
├── file-binding.ts               # File binding rules and logic
├── upload-enforcement.ts         # Upload flow enforcement
├── portal-management.ts          # Portal deactivation/reactivation
├── portal-creation.ts            # Portal creation with storage binding
├── portal-locking.ts             # Portal storage locking rules
├── account-states.ts             # Storage account state definitions
├── data-integrity-helpers.ts     # Data integrity validation
├── google-drive.ts               # Google Drive service implementation
├── dropbox.ts                    # Dropbox service implementation
├── types.ts                      # TypeScript types
└── single-email-manager.ts       # Single email storage management
```

### API Routes

```
app/api/
├── storage/
│   ├── accounts/route.ts         # GET storage accounts
│   ├── deactivate/route.ts       # POST deactivate storage account
│   ├── reactivate/route.ts       # POST reactivate storage account
│   ├── fix-accounts/route.ts     # POST create missing storage accounts
│   ├── sync-oauth-status/route.ts # POST sync OAuth status
│   └── refresh-token/route.ts    # POST refresh OAuth token
├── upload/route.ts               # POST upload file
├── uploads/
│   ├── [id]/route.ts             # GET/DELETE file
│   └── [id]/download/route.ts    # GET download file
├── portals/
│   ├── route.ts                  # GET/POST portals
│   └── [id]/route.ts             # GET/PUT/DELETE portal
└── v1/
    ├── storage/route.ts          # GET enhanced storage info
    └── uploads/route.ts          # GET uploads with filters
```

### UI Components

```
app/dashboard/
├── settings/
│   └── components/
│       └── ConnectedAccounts.tsx # Storage account management UI
├── portals/
│   └── page.tsx                  # Portals list and management
└── files/
    └── page.tsx                  # Files list and management

lib/
└── storage-utils.tsx             # Storage status indicator component
```

### Database

```
prisma/
└── schema.prisma                 # Database schema with StorageAccount model
```

### Tests

```
__tests__/
├── lib/
│   ├── storage-services.test.ts  # Storage service tests
│   └── portal-cache.test.ts      # Portal cache tests
├── api/
│   ├── storage.test.ts           # Storage API tests
│   ├── upload.test.ts            # Upload API tests
│   ├── uploads.test.ts           # Uploads API tests
│   └── portals.test.ts           # Portals API tests
└── integration/
    ├── upload-flow.test.ts       # Upload flow integration tests
    └── billing-flow.test.ts      # Billing flow integration tests
```

### Scripts

```
scripts/
├── diagnose-storage-issue.ts     # Diagnose storage account issues
├── fix-storage-accounts.ts       # Fix storage account data
├── migrate-storage-accounts.ts   # Migrate storage accounts
└── cleanup-zombie-accounts.ts    # Clean up zombie OAuth accounts
```

---

## Common Workflows

### 1. User Connects Google Drive

```
1. User clicks "Connect Google Drive" in settings
2. OAuth flow redirects to Google
3. User authorizes access
4. Callback creates Account record (OAuth)
5. StorageAccountManager.createOrGetStorageAccount()
   ├─ Creates StorageAccount record
   ├─ Sets status to ACTIVE
   └─ Links to OAuth Account via providerAccountId
6. UI shows "Connected" status
```

### 2. User Creates Portal

```
1. User navigates to "Create Portal"
2. Selects storage provider (Google Drive)
3. System validates:
   ├─ User has at least one storage account for provider
   ├─ At least one account is ACTIVE
   └─ Selected account (if any) is ACTIVE
4. Portal created with storageAccountId binding
5. Portal can now accept uploads
```

### 3. Client Uploads File

```
1. Client visits portal URL
2. Selects file and fills form
3. POST /api/upload
4. System determines storage account:
   ├─ Use portal's storageAccountId if ACTIVE
   ├─ Or find user's active account for provider
   └─ Fail if no active account
5. File uploaded to cloud storage
6. FileUpload record created with storageAccountId
7. Binding is now permanent
```

### 4. User Disconnects Storage

```
1. User clicks "Disconnect" in settings
2. POST /api/storage/deactivate
3. StorageAccount status → DISCONNECTED
4. Portal management triggered:
   ├─ Find all portals using this storage account
   ├─ Deactivate all portals
   └─ Create audit logs
5. Files become inaccessible
6. Portals show "Storage Disconnected" status
```

### 5. User Reconnects Storage

```
1. User clicks "Connect Google Drive" again
2. OAuth flow completes
3. StorageAccountManager finds existing DISCONNECTED account
4. Reactivates account (status → ACTIVE)
5. Portal management triggered:
   ├─ Find portals that were auto-deactivated
   ├─ Reactivate those portals
   └─ Create audit logs
6. Files become accessible again
7. Portals become operational
```

---

## Troubleshooting

### Common Issues

#### 1. "No active storage account available"
**Cause:** User has no ACTIVE storage accounts for the portal's provider  
**Solution:**
- Check storage account status in settings
- Reconnect storage account if DISCONNECTED
- Reactivate storage account if INACTIVE

#### 2. "File unavailable"
**Cause:** File's storage account is DISCONNECTED or ERROR  
**Solution:**
- Check file's storage account status
- Reconnect storage account
- File will become accessible again

#### 3. "Portal cannot accept uploads"
**Cause:** Portal's storage account is not ACTIVE  
**Solution:**
- Check portal's storage account status
- Reactivate or change portal's storage account
- Portal will accept uploads again

#### 4. Missing StorageAccount records
**Cause:** OAuth account exists but no StorageAccount created  
**Solution:**
- Click "Fix Storage" button in settings
- Or call POST /api/storage/fix-accounts
- System will create missing StorageAccounts

### Debug Pages

- `/debug-storage` - View storage account status
- `/debug-portal` - Test portal creation
- `/debug-cleanup` - Clean up orphaned files
- `/debug-all` - Comprehensive debug view

---

## Best Practices

### For Developers

1. **Always use StorageAccountManager** for creating storage accounts
2. **Never modify storageAccountId** after file upload
3. **Check storage account status** before allowing uploads/downloads
4. **Use getUploadRules()** to determine storage account for uploads
5. **Handle token refresh failures** by updating storage account status
6. **Log all storage account state changes** for audit trail

### For Users

1. **Keep storage accounts connected** for uninterrupted service
2. **Don't revoke OAuth access** unless you want to disconnect
3. **Use "Fix Storage" button** if you see connection issues
4. **Check portal status** before sharing portal links
5. **Reactivate storage accounts** instead of disconnecting/reconnecting

---

## Future Enhancements

### Planned Features

1. **Multi-account support** - Multiple storage accounts per provider
2. **Storage account selection** - Choose which account to use per portal
3. **Automatic failover** - Switch to backup storage account on failure
4. **Storage migration** - Move files between storage accounts
5. **Storage analytics** - Track storage usage per account
6. **Webhook notifications** - Alert on storage account issues

### Technical Debt

1. **Remove deprecated fields** - storageProvider, isActive
2. **Implement Redis locking** - Replace in-memory locks
3. **Add storage account health checks** - Proactive monitoring
4. **Improve error messages** - More user-friendly error handling
5. **Add storage account quotas** - Track and enforce storage limits

---

## Related Documentation

- [BILLING_STATUS.md](./BILLING_STATUS.md) - Billing system status
- [WEBHOOK_SETUP_GUIDE.md](./WEBHOOK_SETUP_GUIDE.md) - Webhook configuration
- [PAYSTACK_INTEGRATION_GUIDE.md](./PAYSTACK_INTEGRATION_GUIDE.md) - Payment integration
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema

---

**End of Storage Account Architecture Documentation**
