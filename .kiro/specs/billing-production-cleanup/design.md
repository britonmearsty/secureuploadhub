# Design Document: Billing System Production Cleanup

## Overview

This design addresses production readiness of the billing system through incremental, safe improvements. The current subscription flow works correctly - users can subscribe and payments activate subscriptions. This design focuses on:

1. **Configuration fixes** - Correcting webhook secrets and currency handling
2. **Code cleanup** - Removing test/debug code
3. **Production features** - Adding missing business logic (cancellation, reactivation, etc.)
4. **Safety** - No UI changes, no massive refactors, check before implementing

## Architecture

### Current State Analysis

**What Works:**
- Subscription creation flow (POST /api/billing/subscription)
- Payment initialization via Paystack
- Webhook handling for charge.success
- Subscription activation via activateSubscription()
- Database schema includes authorizationCode field in Payment model ✅

**What Needs Fixing:**
- Webhook secret uses wrong environment variable
- Currency handling has inconsistencies
- Manual amount conversion in initialize-payment route
- Test/debug files in production code
- Missing business logic features

### Implementation Strategy

**Incremental Approach:**
1. Start with configuration fixes (low risk)
2. Remove test/debug code (cleanup)
3. Add missing business logic one feature at a time
4. Each change is isolated and testable

**Safety Principles:**
- Check existing implementation before changing
- One file at a time when possible
- No UI component changes
- Preserve working subscription flow
- Add features, don't refactor existing code

## Components and Interfaces

### 1. Configuration Management

**File:** `lib/paystack-config.ts`

**Current Implementation:**
```typescript
export const PAYSTACK_CONFIG: PaystackConfig = {
  secretKey: requireEnv("PAYSTACK_SECRET_KEY"),
  publicKey: requireEnv("PAYSTACK_PUBLIC_KEY"),
  webhookSecret: requireEnv("PAYSTACK_WEBHOOK_SECRET"), // ❌ WRONG
  baseUrl: requireEnv("NEXTAUTH_URL")
}
```

**Fixed Implementation:**
```typescript
export const PAYSTACK_CONFIG: PaystackConfig = {
  secretKey: requireEnv("PAYSTACK_SECRET_KEY"),
  publicKey: requireEnv("PAYSTACK_PUBLIC_KEY"),
  webhookSecret: requireEnv("PAYSTACK_SECRET_KEY"), // ✅ Use secret key
  baseUrl: requireEnv("NEXTAUTH_URL")
}
```

**Rationale:** Paystack uses the same secret key for both API calls and webhook verification. No separate webhook secret exists.

### 2. Currency Handling

**Current State:** ✅ Already implemented correctly
- `lib/paystack-currency.ts` exists with proper conversion functions
- `getPaystackCurrency()` handles currency mapping
- `convertToPaystackSubunit()` handles amount conversion

**Issue Found:** `app/api/billing/initialize-payment/route.ts` uses manual `amount * 100`

**Fix:** Replace manual conversion with `convertToPaystackSubunit()`

### 3. Amount Conversion

**Files to Check:**
- ✅ `lib/paystack-currency.ts` - Has `convertToPaystackSubunit()`
- ❌ `app/api/billing/initialize-payment/route.ts` - Uses `amount * 100`
- ✅ `app/api/billing/subscription/route.ts` - Uses `convertToPaystackSubunit()`

**Action:** Update initialize-payment route only

### 4. Authorization Code Storage

**Current State:** ✅ Already implemented
- Prisma schema has `authorizationCode String?` in Payment model
- `lib/subscription-manager.ts` stores authorization code
- `app/api/billing/subscription/route.ts` checks for existing authorization

**Action:** No changes needed, feature exists

### 5. Test/Debug Code Removal

**Files to Remove:**
```
Root directory:
- test-billing.js
- test-complete-flow.js
- test-payment-flow.js
- test-paystack-direct.js
- test-subscription-fix.js
- test-upload-timeout-fix.js
- test-webhook-endpoint-external.js
- test-webhook-paystack.js
- test-deactivation.js
- test-deactivation-fix.js
- test-http-deactivation.js
- test-api-deactivation.js
- debug-billing-issue.js
- fix-billing-issues.js
- simulate-webhook-events.js
- run-working-tests.js

Debug API endpoints:
- app/api/billing/debug/ (entire directory)

Components:
- components/billing/BillingDebug.tsx

Scripts:
- scripts/test-billing-flow.ts
- scripts/test-subscription-api.ts
- scripts/test-complete-billing-flow.ts
- scripts/debug-billing-issue.ts
- scripts/test-upgrade-button-flow.ts

Documentation (keep but move to docs/):
- WEBHOOK_DIAGNOSIS_SUMMARY.md
- WEBHOOK_SETUP_GUIDE.md
- PAYSTACK_INTEGRATION_GUIDE.md
- investigate-external-webhook-issues.md
```

**Action:** Delete test/debug files, remove BillingDebug import from BillingClient.tsx

### 6. Logging System

**Current State:** Uses `console.log` throughout

**Implementation:** Create structured logger

**File:** `lib/logger.ts` (new)

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString()
  const isProd = process.env.NODE_ENV === 'production'
  
  if (isProd) {
    // JSON format for production
    console.log(JSON.stringify({
      timestamp,
      level,
      message,
      ...context
    }))
  } else {
    // Pretty format for development
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`)
  }
}

// Helper to redact sensitive data
export function redactSecrets(obj: any): any {
  const redacted = { ...obj }
  const sensitiveKeys = ['secret', 'key', 'token', 'password', 'authorization']
  
  for (const key in redacted) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED]'
    }
  }
  
  return redacted
}
```

**Migration Strategy:** Replace console.log incrementally, starting with webhook route

## Data Models

### Current Schema Analysis

**Payment Model:** ✅ Has authorizationCode field
```prisma
model Payment {
  authorizationCode  String?  // ✅ Already exists
  // ... other fields
}
```

**Subscription Model:** ✅ Has all needed fields
```prisma
model Subscription {
  cancelAtPeriodEnd      Boolean   @default(false)  // ✅ For cancellation
  gracePeriodEnd         DateTime?                  // ✅ For failed payments
  retryCount             Int       @default(0)      // ✅ For retry logic
  // ... other fields
}
```

**Action:** No schema changes needed

## Business Logic Features

### Feature 1: Subscription Cancellation

**Current State:** ✅ Already implemented in `lib/subscription-manager.ts`

**Function:** `cancelSubscription(userId: string)`

**Verification Needed:** Check if it's exposed via API route

**File to Check:** `app/api/billing/subscription/route.ts`

**Finding:** ✅ DELETE method exists and calls `cancelSubscription()`

**Action:** No changes needed, feature exists

### Feature 2: Subscription Reactivation

**Current State:** ❌ Not implemented

**Implementation:** Add PATCH endpoint to `/api/billing/subscription`

**File:** `app/api/billing/subscription/route.ts`

**New Function in subscription-manager.ts:**
```typescript
export async function reactivateSubscription(userId: string) {
  // Find subscription with cancelAtPeriodEnd = true
  // Remove cancelAtPeriodEnd flag
  // Call Paystack to enable subscription
  // Return success
}
```

### Feature 3: Subscription Upgrade/Downgrade

**Current State:** ❌ Not implemented

**Implementation:** Add PUT endpoint to `/api/billing/subscription`

**Complexity:** Medium - requires proration calculation

**File:** New `lib/subscription-upgrade.ts`

### Feature 4: Failed Payment Handling

**Current State:** ✅ Partially implemented in webhook route

**Function:** `handleInvoicePaymentFailed()` exists

**Missing:** Email notification

**Action:** Add email sending to existing function

### Feature 5: Payment History Display

**Current State:** ❌ Not implemented in UI

**Backend:** ✅ GET /api/billing/subscription returns payments

**Action:** No backend changes needed (UI only, which we're avoiding)

### Feature 6: Invoice Generation

**Current State:** ❌ Not implemented

**Implementation:** Create invoice generation service

**File:** New `lib/invoice-generator.ts`

**Trigger:** After successful payment in webhook

### Feature 7: Webhook Retry Logic

**Current State:** ✅ Already implemented

**File:** `lib/enhanced-webhook-retry.ts`

**Functions:** `withWebhookRetry()`, `isRetryableWebhookError()`

**Action:** No changes needed, feature exists

### Feature 8: Database Cleanup Script

**Current State:** ❌ Not implemented

**Implementation:** Create cleanup script

**File:** New `scripts/cleanup-incomplete-subscriptions.ts`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Webhook Signature Validation

*For any* webhook request with valid Paystack signature, validating with PAYSTACK_SECRET_KEY should return true

**Validates: Requirements 1.1, 1.3**

### Property 2: Currency Conversion Consistency

*For any* plan price and currency, converting to Paystack subunit using convertToPaystackSubunit should equal manual multiplication by 100

**Validates: Requirements 3.1, 3.2**

### Property 3: Amount Conversion Round Trip

*For any* amount in base currency, converting to subunit then dividing by 100 should return the original amount (within floating point tolerance)

**Validates: Requirements 3.4**

### Property 4: Authorization Code Persistence

*For any* successful payment with authorization code, the payment record should store the authorization code

**Validates: Requirements 4.1**

### Property 5: Idempotency of Subscription Creation

*For any* user and plan, creating a subscription twice within the idempotency window should return the same subscription ID

**Validates: Requirements 5.1, 5.2**

### Property 6: Payment Amount Validation

*For any* payment verification, if the paid amount differs from expected by more than tolerance, validation should fail

**Validates: Requirements 6.1, 6.2**

### Property 7: Secret Redaction in Logs

*For any* log entry containing secret keys, the logged output should not contain the actual secret value

**Validates: Requirements 7.1, 7.4**

### Property 8: Cancellation Idempotency

*For any* subscription, cancelling twice should produce the same result without error

**Validates: Requirements 12.1**

### Property 9: Reactivation Precondition

*For any* subscription reactivation request, it should only succeed if cancelAtPeriodEnd is true and period has not ended

**Validates: Requirements 13.1**

### Property 10: Grace Period Bounds

*For any* failed payment, the grace period end date should be exactly 7 days after the failure

**Validates: Requirements 15.2**

## Error Handling

### Configuration Errors

**Scenario:** Missing or invalid environment variables

**Handling:**
- Fail fast on startup if critical vars missing
- Log clear error messages
- Provide setup instructions

### Payment Errors

**Scenario:** Paystack API failures

**Handling:**
- Retry transient errors (network, timeout)
- Don't retry permanent errors (invalid card)
- Log all errors with context
- Return user-friendly messages

### Webhook Errors

**Scenario:** Webhook processing failures

**Handling:**
- Return 503 for retryable errors
- Return 400 for invalid signatures
- Use idempotency to handle duplicates
- Log all webhook events

### Database Errors

**Scenario:** Transaction failures, deadlocks

**Handling:**
- Use distributed locks for critical operations
- Retry on deadlock
- Rollback transactions on error
- Maintain data consistency

## Testing Strategy

### Unit Tests

**Focus Areas:**
- Currency conversion functions
- Amount validation logic
- Webhook signature verification
- Logger redaction function

**Test Files:**
- `__tests__/lib/paystack-currency.test.ts` (keep)
- `__tests__/lib/logger.test.ts` (new)
- `__tests__/lib/subscription-manager.test.ts` (keep)

### Integration Tests

**Focus Areas:**
- Subscription creation flow
- Cancellation flow
- Reactivation flow
- Webhook processing

**Test Files:**
- `__tests__/integration/billing-flow.test.ts` (keep)

### Property-Based Tests

**Implementation:** Use fast-check library

**Properties to Test:**
- Currency conversion round trip
- Amount validation tolerance
- Idempotency of operations

**Configuration:** Minimum 100 iterations per test

## Implementation Plan Summary

### Phase 1: Configuration Fixes (Low Risk)
1. Update webhook secret in paystack-config.ts
2. Fix amount conversion in initialize-payment route
3. Add environment variable validation

### Phase 2: Code Cleanup (Low Risk)
1. Delete test files from root directory
2. Remove debug API endpoints
3. Remove BillingDebug component import
4. Move documentation to docs/ folder

### Phase 3: Logging (Medium Risk)
1. Create logger utility
2. Replace console.log in webhook route
3. Replace console.log in subscription route
4. Add secret redaction

### Phase 4: Missing Features (Medium-High Risk)
1. Add reactivation endpoint
2. Add upgrade/downgrade logic
3. Add email notifications for failed payments
4. Add invoice generation
5. Create database cleanup script

### Phase 5: Validation & Testing
1. Test each feature in isolation
2. Run integration tests
3. Verify no regressions in working flow
4. Deploy incrementally

## Notes

- Keep __tests__/ directory - tests are valuable
- Don't change UI components
- Each phase can be deployed independently
- Verify existing implementation before adding features
- Prioritize safety over speed
