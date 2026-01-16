# Implementation Plan: Billing System Production Cleanup

## Overview

This is a **code cleanup and verification** project. The billing system works correctly - this plan focuses on removing test/debug code, eliminating redundancy, and verifying all business logic features are present.

**Key Principle:** If a change affects multiple files or risks breaking functionality, SKIP it and document instead.

## Tasks

- [x] 1. Environment Configuration Cleanup
  - Review .env file and identify redundant variables
  - Document that PAYSTACK_WEBHOOK_SECRET has same value as PAYSTACK_SECRET_KEY
  - Check if PAYSTACK_WEBHOOK_SECRET can be safely removed from code
  - If removal affects multiple files, document and skip
  - _Requirements: 1.1, 1.2_

- [x] 2. Remove Test Files from Root Directory
  - [x] 2.1 Delete test-*.js files from root
    - Delete test-billing.js
    - Delete test-complete-flow.js
    - Delete test-payment-flow.js
    - Delete test-paystack-direct.js
    - Delete test-subscription-fix.js
    - Delete test-upload-timeout-fix.js
    - Delete test-webhook-endpoint-external.js
    - Delete test-webhook-paystack.js
    - Delete test-deactivation.js
    - Delete test-deactivation-fix.js
    - Delete test-http-deactivation.js
    - Delete test-api-deactivation.js
    - _Requirements: 11.1_

  - [x] 2.2 Delete debug files from root
    - Delete debug-billing-issue.js
    - Delete fix-billing-issues.js
    - Delete simulate-webhook-events.js
    - Delete run-working-tests.js
    - Delete fix-storage-connections.js
    - Delete debug-storage-accounts.js
    - _Requirements: 11.2_

  - [x] 2.3 Move documentation files to docs/ folder
    - Create docs/ folder if it doesn't exist
    - Move WEBHOOK_DIAGNOSIS_SUMMARY.md to docs/
    - Move WEBHOOK_SETUP_GUIDE.md to docs/
    - Move PAYSTACK_INTEGRATION_GUIDE.md to docs/
    - Move investigate-external-webhook-issues.md to docs/
    - _Requirements: 11.1_

- [x] 3. Remove Debug API Endpoints
  - [x] 3.1 Check if app/api/billing/debug/ directory exists
    - If exists, delete entire directory
    - If doesn't exist, mark as complete
    - _Requirements: 11.3_

- [x] 4. Remove Debug Components from UI
  - [x] 4.1 Check BillingClient.tsx for BillingDebug import
    - Read app/dashboard/billing/BillingClient.tsx
    - If BillingDebug is imported, remove the import line
    - If BillingDebug component is rendered, remove the JSX
    - If not present, mark as complete
    - _Requirements: 11.2_

  - [x] 4.2 Delete BillingDebug component file
    - Check if components/billing/BillingDebug.tsx exists
    - If exists, delete the file
    - If doesn't exist, mark as complete
    - _Requirements: 11.2_

- [x] 5. Remove Test Scripts from scripts/ Directory
  - [x] 5.1 Delete billing-specific test scripts
    - Delete scripts/test-billing-flow.ts (if exists)
    - Delete scripts/test-subscription-api.ts (if exists)
    - Delete scripts/test-complete-billing-flow.ts (if exists)
    - Delete scripts/debug-billing-issue.ts (if exists)
    - Delete scripts/test-upgrade-button-flow.ts (if exists)
    - _Requirements: 11.4_

- [x] 6. Verify Subscription Cancellation Feature
  - [x] 6.1 Check DELETE endpoint exists
    - Read app/api/billing/subscription/route.ts
    - Verify DELETE method is exported
    - Verify it calls cancelSubscription()
    - Document findings
    - _Requirements: 12.1, 12.2_

  - [x] 6.2 Test cancellation in UI
    - Navigate to billing page
    - Check if cancel button exists
    - Verify cancel flow works
    - Document any issues found
    - _Requirements: 12.3, 12.4_

- [x] 7. Check Subscription Reactivation Feature
  - [x] 7.1 Check if reactivation endpoint exists
    - Read app/api/billing/subscription/route.ts
    - Look for PATCH or PUT method for reactivation
    - If missing, document as "Feature Missing: Reactivation"
    - If exists, verify implementation
    - _Requirements: 13.1, 13.2_

  - [x] 7.2 Check UI for reactivation option
    - Read app/dashboard/billing/BillingClient.tsx
    - Check if reactivation button exists for cancelled subscriptions
    - Document findings
    - _Requirements: 13.1_

- [x] 8. Check Subscription Upgrade/Downgrade Feature
  - [x] 8.1 Check if upgrade endpoint exists
    - Read app/api/billing/subscription/route.ts
    - Look for PUT or PATCH method for plan changes
    - If missing, document as "Feature Missing: Upgrade/Downgrade"
    - If exists, verify implementation
    - _Requirements: 14.1, 14.2_

  - [x] 8.2 Check UI for upgrade/downgrade options
    - Read app/dashboard/billing/BillingClient.tsx
    - Check if plan change buttons exist
    - Document findings
    - _Requirements: 14.1_

- [x] 9. Verify Failed Payment Handling
  - [x] 9.1 Check webhook handler for failed payments
    - Read app/api/billing/webhook/route.ts
    - Verify handleInvoicePaymentFailed() exists
    - Check if it sets grace period
    - Check if it sends email notification
    - Document findings
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 10. Check Payment History Display
  - [x] 10.1 Verify backend returns payment history
    - Read app/api/billing/subscription/route.ts GET method
    - Verify it includes payments in response
    - Document findings
    - _Requirements: 16.1_

  - [x] 10.2 Check UI displays payment history
    - Read app/dashboard/billing/BillingClient.tsx
    - Check if payments are displayed
    - Document findings
    - _Requirements: 16.2_

- [x] 11. Check Invoice Generation Feature
  - [x] 11.1 Search for invoice generation code
    - Search codebase for "invoice" generation
    - Check if invoices are created after payments
    - If missing, document as "Feature Missing: Invoice Generation"
    - If exists, verify implementation
    - _Requirements: 17.1, 17.2_

- [x] 12. Verify Subscription Status Display
  - [x] 12.1 Check UI shows subscription status
    - Read app/dashboard/billing/BillingClient.tsx
    - Verify status is displayed prominently
    - Verify next billing date is shown
    - Verify grace period warning is shown (if applicable)
    - Document findings
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 13. Check Database Cleanup Utilities
  - [x] 13.1 Search for cleanup scripts
    - Check scripts/ directory for cleanup utilities
    - Check for incomplete subscription cleanup
    - If missing, document as "Feature Missing: DB Cleanup Script"
    - If exists, verify implementation
    - _Requirements: 19.1, 19.2_

- [x] 14. Verify Amount Conversion Consistency
  - [x] 14.1 Check initialize-payment route
    - Read app/api/billing/initialize-payment/route.ts
    - Check if it uses convertToPaystackSubunit() or manual * 100
    - If manual, note for potential cleanup (only if safe)
    - _Requirements: 3.1, 3.2_

- [x] 15. Final Verification and Documentation
  - [x] 15.1 Create feature status report
    - Document all existing features
    - Document all missing features
    - Document all cleanup completed
    - Create summary in BILLING_STATUS.md
    - _Requirements: All_

  - [x] 15.2 Test subscription flow end-to-end
    - Create test subscription
    - Verify payment works
    - Verify activation works
    - Verify cancellation works (if implemented)
    - Document any issues
    - _Requirements: All_

## Notes

- **IMPORTANT:** If any task requires changes to multiple files or risks breaking functionality, SKIP the change and document it instead
- Keep __tests__/ directory - tests are valuable for future development
- Focus on cleanup and verification, not refactoring
- Each task should be completable in isolation
- Document findings for missing features - don't implement them unless explicitly safe
