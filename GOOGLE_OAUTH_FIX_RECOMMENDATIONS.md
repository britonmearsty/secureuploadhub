# Google OAuth Storage Account Fix - UPDATED

## Issue
Google OAuth completes successfully but storage account remains DISCONNECTED instead of ACTIVE.

## Root Cause Analysis
From the logs:
- OAuth callback returns 200 (success)
- `hasValidOAuth: true` (OAuth account exists)
- `storageStatus: 'DISCONNECTED'` (Storage account not activated)
- Email sending error during callback (domain not verified)

## Immediate Fixes

### 1. Fix Email Domain Issue (Recommended) - ⏳ PENDING
The email error might be interfering with the OAuth process:

```
Failed to send email: { statusCode: 403, message: 'The yourdomain.com domain is not verified. Please, add and verify your domain on https://resend.com/domains', name: 'validation_error' }
```

**Action:** Add and verify the domain in Resend dashboard.

### 2. Make Sign-in Notification Non-Blocking - ✅ COMPLETED
~~In `auth.ts`, the `sendSignInNotification` is using `await` which could block the process~~

**FIXED:** Changed from blocking to non-blocking implementation:

```typescript
// OLD (blocking):
await sendSignInNotification({
  to: user.email,
  // ...
});

// NEW (non-blocking):
sendSignInNotification({
  to: user.email,
  // ...
}).catch((error) => {
  console.error("Failed to send sign-in notification:", error);
});
```

This ensures that email failures won't interrupt the OAuth callback process and storage account creation.

### 3. Add Manual Storage Account Sync
Create a button in the UI to manually trigger storage account creation for existing OAuth accounts.

### 4. Enhanced Logging
Add more detailed logging to track the exact failure point in the OAuth callback process.

## Implementation Priority

1. **High Priority:** Fix email domain verification
2. **Medium Priority:** Make email sending non-blocking
3. **Low Priority:** Add manual sync option

## Testing Steps

1. Fix email domain issue
2. Try Google OAuth again
3. Check if storage account becomes ACTIVE
4. If still failing, implement non-blocking email fix
5. Add manual sync as backup option

## Code Changes Needed

### auth.ts - Make email non-blocking:
```typescript
// In events.signIn
sendSignInNotification({
  to: user.email,
  userFirstname: user.name?.split(' ')[0],
  signInDate: new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  }),
  signInDevice: userAgent,
  signInLocation: ip,
}).catch((error) => {
  console.error("Failed to send sign-in notification:", error);
});
```

### Add manual sync API endpoint:
```typescript
// app/api/storage/manual-sync/route.ts
export async function POST() {
  // Call SingleEmailStorageManager.autoDetectStorageAccount for existing OAuth accounts
}
```