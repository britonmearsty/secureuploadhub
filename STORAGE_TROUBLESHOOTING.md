# Storage Account Troubleshooting Guide

## "No active google_drive storage account available" Error

This error occurs when users try to create a portal but the system can't find any Google Drive storage accounts in ACTIVE status.

### ✅ FIXED: Automatic StorageAccount Creation

**As of this update, StorageAccount records are now automatically created when users sign up with OAuth.** This should prevent the issue from occurring for new users.

### Quick Fix for Users

1. **Run Storage Health Check** (Recommended)
   - Go to your dashboard settings
   - Find the "Storage Health Check" section
   - Click "Run Storage Health Check"
   - This will automatically detect and fix most issues

2. **Manual Fix - Reconnect Storage**
   - Go to Settings → Connected Accounts
   - Disconnect your Google Drive account
   - Reconnect your Google Drive account
   - Try creating the portal again

### Quick Fix for Administrators

```bash
# Diagnose a specific user
npx tsx scripts/diagnose-storage-issue.ts user@example.com

# Fix a specific user (dry run first)
npx tsx scripts/fix-storage-accounts.ts --dry-run user@example.com
npx tsx scripts/fix-storage-accounts.ts user@example.com

# Fix all affected users
npx tsx scripts/fix-storage-accounts.ts --dry-run
npx tsx scripts/fix-storage-accounts.ts

# Test automatic creation for a user
npx tsx scripts/test-auto-create.ts user@example.com

# Test automatic creation for all users
npx tsx scripts/test-auto-create.ts
```

### Automatic Prevention System

The following mechanisms now prevent this issue:

#### 1. OAuth Integration (auth.ts)
- **linkAccount Event**: Automatically creates StorageAccount when OAuth account is linked
- **Handles both**: New user signup and linking additional accounts
- **Providers**: Google Drive and Dropbox

#### 2. Fallback Mechanisms
- **Portal Creation**: Checks and creates missing StorageAccounts before validation
- **Storage API**: Ensures StorageAccounts exist when fetching connected accounts
- **Health Check**: Enhanced to create missing accounts

#### 3. Manual Triggers
- **API Endpoint**: `/api/storage/ensure-accounts` for manual creation
- **Admin Tools**: Scripts for batch processing and testing

### API Endpoints

#### Ensure StorageAccounts
```bash
# For current user
POST /api/storage/ensure-accounts

# For all users (admin only)
POST /api/storage/ensure-accounts
Content-Type: application/json
{ "allUsers": true }
```

#### Enhanced Health Check
```bash
# Now creates missing accounts AND validates existing ones
POST /api/storage/health-check
```

### Root Causes and Solutions

#### 1. Missing StorageAccount Records

**Problem**: User has OAuth connection but no StorageAccount record in database.

**Symptoms**:
- User can see Google Drive in connected accounts
- Portal creation fails with "No active storage account"
- Database has Account record but no StorageAccount record

**Solution**:
```sql
-- Check for missing StorageAccount records
SELECT u.email, a.provider, a.providerAccountId
FROM "User" u
JOIN "Account" a ON u.id = a."userId"
LEFT JOIN "StorageAccount" sa ON u.id = sa."userId" 
  AND a."providerAccountId" = sa."providerAccountId"
WHERE a.provider IN ('google', 'dropbox')
  AND sa.id IS NULL;
```

**Fix**: Run the fix script or health check API to create missing records.

#### 2. Incorrect StorageAccount Status

**Problem**: StorageAccount exists but status is not ACTIVE.

**Symptoms**:
- StorageAccount record exists
- Status is INACTIVE, DISCONNECTED, or ERROR
- Connection may actually be working

**Possible Statuses**:
- `ACTIVE`: Can create new uploads ✅
- `INACTIVE`: Cannot create new uploads (user deactivated)
- `DISCONNECTED`: OAuth revoked, no access
- `ERROR`: Temporary connection issues

**Solution**: Validate connection and update status accordingly.

#### 3. Provider Name Mismatch

**Problem**: StorageAccount has wrong provider value.

**Symptoms**:
- Account record has `provider: "google"`
- StorageAccount has `provider: "google"` (should be `"google_drive"`)

**Fix**:
```sql
-- Update incorrect provider names
UPDATE "StorageAccount" 
SET provider = 'google_drive' 
WHERE provider = 'google';

UPDATE "StorageAccount" 
SET provider = 'dropbox' 
WHERE provider = 'dropbox_oauth';
```

#### 4. Expired/Invalid OAuth Tokens

**Problem**: OAuth tokens expired or revoked.

**Symptoms**:
- Token validation fails
- API calls to Google Drive return 401/403
- Refresh token may also be invalid

**Solution**:
- User needs to reconnect their account
- System should mark account as DISCONNECTED
- Health check will detect and update status

#### 5. Database Migration Issues

**Problem**: System was upgraded but StorageAccount records weren't created for existing users.

**Solution**: Run the migration script:
```bash
npx tsx scripts/migrate-storage-accounts.ts
```

### Diagnostic Tools

#### 1. User-Level Diagnostics

```typescript
// Check user's storage accounts
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
  include: {
    accounts: { where: { provider: { in: ["google", "dropbox"] } } },
    storageAccounts: true
  }
})

// Validate connections
import { validateStorageConnection } from "@/lib/storage"
const validation = await validateStorageConnection(userId, "google_drive")
```

#### 2. System-Level Diagnostics

```bash
# Find all users with OAuth but no active storage accounts
npx tsx scripts/diagnose-storage-issue.ts

# Check specific user
npx tsx scripts/diagnose-storage-issue.ts user@example.com
```

#### 3. Database Queries

```sql
-- Users with OAuth accounts but no StorageAccount records
SELECT u.email, COUNT(a.id) as oauth_accounts, COUNT(sa.id) as storage_accounts
FROM "User" u
LEFT JOIN "Account" a ON u.id = a."userId" AND a.provider IN ('google', 'dropbox')
LEFT JOIN "StorageAccount" sa ON u.id = sa."userId"
GROUP BY u.id, u.email
HAVING COUNT(a.id) > 0 AND COUNT(sa.id) = 0;

-- StorageAccount status distribution
SELECT provider, status, COUNT(*) as count
FROM "StorageAccount"
GROUP BY provider, status
ORDER BY provider, status;

-- Recent portal creation failures
SELECT p.name, p."storageProvider", u.email, p."createdAt"
FROM "UploadPortal" p
JOIN "User" u ON p."userId" = u.id
WHERE p."storageAccountId" IS NULL
ORDER BY p."createdAt" DESC
LIMIT 10;
```

### Prevention Strategies

#### 1. Automatic StorageAccount Creation

Ensure StorageAccount records are created when OAuth accounts are established:

```typescript
// In OAuth callback handler
async function handleOAuthCallback(userId: string, provider: string, providerAccountId: string) {
  // Create Account record
  const account = await prisma.account.create({ /* ... */ })
  
  // Create corresponding StorageAccount record
  const storageProvider = provider === "google" ? "google_drive" : "dropbox"
  await prisma.storageAccount.create({
    data: {
      userId,
      provider: storageProvider,
      providerAccountId,
      status: StorageAccountStatus.ACTIVE,
      // ... other fields
    }
  })
}
```

#### 2. Regular Health Checks

Set up automated health checks:

```typescript
// Cron job to validate storage accounts
async function validateAllStorageAccounts() {
  const accounts = await prisma.storageAccount.findMany({
    where: { status: StorageAccountStatus.ACTIVE }
  })
  
  for (const account of accounts) {
    const validation = await validateStorageConnection(account.userId, account.provider)
    if (!validation.isValid) {
      await prisma.storageAccount.update({
        where: { id: account.id },
        data: { 
          status: StorageAccountStatus.DISCONNECTED,
          lastError: validation.error 
        }
      })
    }
  }
}
```

#### 3. Better Error Messages

Provide actionable error messages:

```typescript
// In portal creation validation
if (activeAccounts.length === 0) {
  const hasInactiveAccounts = providerAccounts.some(acc => acc.status === StorageAccountStatus.INACTIVE)
  const hasDisconnectedAccounts = providerAccounts.some(acc => acc.status === StorageAccountStatus.DISCONNECTED)
  
  if (hasDisconnectedAccounts) {
    return {
      canCreate: false,
      reason: "Your Google Drive account is disconnected. Please reconnect it in Settings.",
      action: "reconnect"
    }
  } else if (hasInactiveAccounts) {
    return {
      canCreate: false,
      reason: "Your Google Drive account is inactive. Please reactivate it in Settings.",
      action: "reactivate"
    }
  } else {
    return {
      canCreate: false,
      reason: "No Google Drive account found. Please connect one in Settings.",
      action: "connect"
    }
  }
}
```

### Testing

#### 1. Test Portal Creation Flow

```typescript
// Test that users can create portals after connecting storage
describe("Portal Creation with Storage", () => {
  it("should create portal after connecting Google Drive", async () => {
    // 1. Connect OAuth account
    // 2. Verify StorageAccount is created
    // 3. Attempt portal creation
    // 4. Verify success
  })
})
```

#### 2. Test Health Check API

```bash
# Test health check endpoint
curl -X POST http://localhost:3000/api/storage/health-check \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Monitoring

Set up monitoring for:
- Portal creation failure rates
- StorageAccount status distribution
- OAuth token refresh failures
- Health check API usage

### Support Escalation

If the above solutions don't work:

1. **Check OAuth Configuration**
   - Verify Google/Dropbox app credentials
   - Check OAuth scopes and permissions
   - Verify redirect URLs

2. **Check Database Constraints**
   - Verify unique constraints on StorageAccount
   - Check foreign key relationships
   - Look for database migration issues

3. **Check External API Issues**
   - Google Drive API quotas/limits
   - Dropbox API status
   - Network connectivity issues

4. **Contact Support**
   - Provide user email and timestamp
   - Include diagnostic script output
   - Share relevant error logs