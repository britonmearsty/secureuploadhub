# Requirements Document: Billing System Production Cleanup

## Introduction

This specification addresses the production readiness of the billing system. The system currently works for subscription creation and activation, but contains technical debt, inconsistencies, and test/debug code that must be removed before production deployment. Additionally, several business logic features are missing.

## Glossary

- **Paystack**: Third-party payment provider used for processing subscriptions and payments
- **Webhook**: HTTP callback from Paystack to notify the system of payment events
- **Subscription**: Recurring payment arrangement between user and system
- **Authorization Code**: Paystack token representing saved payment method
- **Kobo**: Nigerian currency subunit (100 kobo = 1 Naira)
- **Subunit**: Smallest currency unit (e.g., cents for USD, kobo for NGN)
- **Grace Period**: Time window after failed payment before subscription cancellation
- **Idempotency**: Ensuring duplicate requests produce same result without side effects

## Requirements

### Requirement 1: Webhook Secret Configuration

**User Story:** As a system administrator, I want the webhook validation to use the correct Paystack secret key, so that webhook signatures are properly verified.

#### Acceptance Criteria

1. WHEN the system validates a webhook signature, THE System SHALL use PAYSTACK_SECRET_KEY instead of PAYSTACK_WEBHOOK_SECRET
2. WHEN PAYSTACK_WEBHOOK_SECRET environment variable is present, THE System SHALL ignore it and log a deprecation warning
3. WHEN webhook signature validation occurs, THE System SHALL use the sk_... key for HMAC-SHA512 verification
4. THE System SHALL remove all references to PAYSTACK_WEBHOOK_SECRET from the codebase
5. THE System SHALL update environment variable documentation to reflect correct configuration

### Requirement 2: Currency Handling Consistency

**User Story:** As a developer, I want consistent currency handling throughout the billing system, so that there are no mismatches between plan prices, Paystack transactions, and frontend displays.

#### Acceptance Criteria

1. WHEN a plan is created or retrieved, THE System SHALL use the plan's currency field as the source of truth
2. WHEN initializing a Paystack payment, THE System SHALL convert the plan currency to Paystack-supported currency using getPaystackCurrency
3. WHEN displaying amounts to users, THE System SHALL use the original plan currency
4. THE System SHALL remove PAYSTACK_DEFAULT_CURRENCY from .env if it conflicts with plan currencies
5. WHEN currency conversion occurs, THE System SHALL log the conversion for audit purposes

### Requirement 3: Amount Conversion Standardization

**User Story:** As a developer, I want all amount conversions to use a single helper function, so that there are no inconsistencies in how amounts are converted to subunits.

#### Acceptance Criteria

1. THE System SHALL use convertToPaystackSubunit for all amount conversions to Paystack format
2. WHEN manual multiplication by 100 is found in code, THE System SHALL replace it with convertToPaystackSubunit
3. THE System SHALL document the conversion logic in code comments
4. WHEN amounts are received from Paystack, THE System SHALL divide by 100 to convert from subunits
5. THE System SHALL validate that converted amounts match expected plan prices within tolerance

### Requirement 4: Authorization Code Handling

**User Story:** As a user, I want my saved payment method to be reused for subscription renewals, so that I don't need to re-enter payment details.

#### Acceptance Criteria

1. WHEN a payment succeeds, THE System SHALL store the authorization_code in the payment record
2. WHEN creating a subscription for a user with existing authorization, THE System SHALL attempt to use the saved authorization
3. IF authorization code is missing from database schema, THE System SHALL handle the absence gracefully
4. WHEN authorization reuse fails, THE System SHALL fall back to payment initialization
5. THE System SHALL log authorization reuse attempts for debugging

### Requirement 5: Idempotency and Race Condition Prevention

**User Story:** As a system administrator, I want to prevent duplicate subscriptions and race conditions, so that users don't get charged multiple times or create conflicting subscriptions.

#### Acceptance Criteria

1. WHEN a subscription creation request is received, THE System SHALL check Redis for recent creation attempts
2. IF a recent creation exists and subscription is still incomplete, THE System SHALL return the existing subscription
3. WHEN Redis keys expire, THE System SHALL clean up incomplete subscriptions that are orphaned
4. THE System SHALL use distributed locks with appropriate timeouts for all subscription operations
5. WHEN lock acquisition fails, THE System SHALL return a clear error message to the user

### Requirement 6: Payment Verification and Amount Validation

**User Story:** As a system administrator, I want all payments to be verified for correct amounts, so that underpaid or overpaid transactions are detected and handled appropriately.

#### Acceptance Criteria

1. WHEN verifying a payment, THE System SHALL compare the paid amount against the expected plan price
2. IF amount mismatch exceeds tolerance threshold, THE System SHALL reject the payment and log for manual review
3. WHEN amount is within tolerance, THE System SHALL accept the payment and log the variance
4. THE System SHALL define tolerance thresholds in configuration (e.g., 1% variance allowed)
5. WHEN payment verification fails, THE System SHALL create an audit log entry for investigation

### Requirement 7: Secret Key Security

**User Story:** As a security administrator, I want to ensure secret keys are never exposed to clients or logs, so that the payment system remains secure.

#### Acceptance Criteria

1. WHEN logging payment operations, THE System SHALL redact secret keys from log output
2. THE System SHALL never send secret keys to client-side code
3. WHEN environment variables are validated, THE System SHALL check for dummy values and fail startup if found in production
4. THE System SHALL use environment-specific keys (test keys in development, live keys in production)
5. WHEN errors occur, THE System SHALL not include secret keys in error messages

### Requirement 8: Production Logging

**User Story:** As a system administrator, I want structured logging instead of console.log statements, so that I can monitor and debug production issues effectively.

#### Acceptance Criteria

1. THE System SHALL replace all console.log statements with structured logger calls
2. WHEN logging events, THE System SHALL include timestamp, log level, and context
3. THE System SHALL use appropriate log levels (debug, info, warn, error)
4. WHEN Redis operations fail, THE System SHALL log errors and handle gracefully without breaking the flow
5. THE System SHALL configure log output format based on environment (JSON in production, pretty in development)

### Requirement 9: Paystack Channel Configuration

**User Story:** As a system administrator, I want to configure which payment channels are available, so that only supported payment methods are offered to users.

#### Acceptance Criteria

1. THE System SHALL define supported payment channels in configuration
2. WHEN initializing payments, THE System SHALL only include configured channels
3. THE System SHALL validate that the Paystack account supports all configured channels
4. IF a channel is not supported, THE System SHALL log a warning and exclude it from the payment initialization
5. THE System SHALL document which channels are available in each environment

### Requirement 10: Callback URL Configuration

**User Story:** As a developer, I want callback URLs to be environment-aware, so that payments redirect correctly in all environments.

#### Acceptance Criteria

1. WHEN initializing a payment, THE System SHALL use NEXTAUTH_URL as the base for callback URLs
2. THE System SHALL validate that NEXTAUTH_URL is set and not a dummy value
3. WHEN environment changes, THE System SHALL use the correct callback URL without code changes
4. THE System SHALL include subscription_id in callback URL query parameters
5. THE System SHALL handle callback URL errors gracefully with clear error messages

### Requirement 11: Test and Debug Code Removal

**User Story:** As a system administrator, I want all test and debug code removed from production, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. THE System SHALL remove all files matching test-*.js, test-*.ts, debug-*.js, debug-*.ts patterns from root directory
2. THE System SHALL remove BillingDebug component from the billing page
3. THE System SHALL remove debug API endpoints from app/api/billing/debug/
4. THE System SHALL remove test scripts from scripts/ directory that are billing-specific
5. THE System SHALL keep __tests__/ directory but ensure tests are not imported in production code

### Requirement 12: Subscription Cancellation

**User Story:** As a user, I want to cancel my subscription, so that I am not charged for future billing periods.

#### Acceptance Criteria

1. WHEN a user requests cancellation, THE System SHALL mark the subscription as cancelAtPeriodEnd
2. THE System SHALL cancel the Paystack subscription via API
3. WHEN cancellation succeeds, THE System SHALL notify the user of the cancellation date
4. THE System SHALL allow access to features until the current period ends
5. WHEN the period ends, THE System SHALL change subscription status to canceled

### Requirement 13: Subscription Reactivation

**User Story:** As a user, I want to reactivate a cancelled subscription before the period ends, so that I can continue using the service without interruption.

#### Acceptance Criteria

1. WHEN a user has a subscription marked cancelAtPeriodEnd, THE System SHALL show a reactivation option
2. WHEN reactivation is requested, THE System SHALL remove the cancelAtPeriodEnd flag
3. THE System SHALL reactivate the Paystack subscription via API
4. WHEN reactivation succeeds, THE System SHALL notify the user
5. THE System SHALL create a subscription history entry for the reactivation

### Requirement 14: Subscription Upgrade/Downgrade

**User Story:** As a user, I want to upgrade or downgrade my subscription plan, so that I can adjust my service level based on my needs.

#### Acceptance Criteria

1. WHEN a user requests a plan change, THE System SHALL calculate prorated amounts
2. THE System SHALL create a new subscription with the new plan
3. THE System SHALL cancel the old subscription at period end
4. WHEN upgrade requires immediate payment, THE System SHALL initialize a payment for the prorated amount
5. WHEN downgrade is requested, THE System SHALL apply the change at the next billing period

### Requirement 15: Failed Payment Handling

**User Story:** As a user, I want to be notified when my payment fails, so that I can update my payment method and avoid service interruption.

#### Acceptance Criteria

1. WHEN a payment fails, THE System SHALL set subscription status to past_due
2. THE System SHALL start a grace period of 7 days
3. THE System SHALL send an email notification to the user
4. WHEN user updates payment method during grace period, THE System SHALL retry the payment
5. IF grace period expires without successful payment, THE System SHALL cancel the subscription

### Requirement 16: Payment History

**User Story:** As a user, I want to view my payment history, so that I can track my subscription charges.

#### Acceptance Criteria

1. WHEN a user views billing page, THE System SHALL display all payments for their subscriptions
2. THE System SHALL show payment date, amount, currency, status, and description
3. THE System SHALL allow filtering by date range and status
4. THE System SHALL provide download/export functionality for payment history
5. THE System SHALL display payment method used (last 4 digits of card)

### Requirement 17: Invoice Generation

**User Story:** As a user, I want to receive invoices for my payments, so that I have records for accounting purposes.

#### Acceptance Criteria

1. WHEN a payment succeeds, THE System SHALL generate an invoice
2. THE System SHALL send the invoice to the user's email
3. THE System SHALL store invoices in the database
4. WHEN a user views billing page, THE System SHALL display downloadable invoices
5. THE System SHALL include all required invoice information (date, amount, tax, company details)

### Requirement 18: Subscription Status Display

**User Story:** As a user, I want to see my current subscription status clearly, so that I understand my account state.

#### Acceptance Criteria

1. WHEN a user views billing page, THE System SHALL display subscription status prominently
2. THE System SHALL show current plan name, price, and billing period
3. THE System SHALL display next billing date
4. IF subscription is in grace period, THE System SHALL show grace period end date and warning
5. IF subscription is cancelled, THE System SHALL show cancellation date and access end date

### Requirement 19: Database Cleanup

**User Story:** As a system administrator, I want to clean up incomplete and orphaned subscriptions, so that the database remains consistent.

#### Acceptance Criteria

1. THE System SHALL provide a script to identify incomplete subscriptions older than 24 hours
2. THE System SHALL allow manual review before deletion
3. WHEN cleaning up, THE System SHALL delete associated payment records
4. THE System SHALL create audit log entries for all deletions
5. THE System SHALL provide a dry-run mode to preview deletions without executing

### Requirement 20: Webhook Retry Logic

**User Story:** As a system administrator, I want webhooks to be retried on transient failures, so that temporary issues don't cause data inconsistencies.

#### Acceptance Criteria

1. WHEN a webhook handler encounters a retryable error, THE System SHALL return HTTP 503
2. THE System SHALL distinguish between retryable and non-retryable errors
3. WHEN Paystack retries a webhook, THE System SHALL process it idempotently
4. THE System SHALL log all webhook retry attempts
5. THE System SHALL alert administrators after maximum retry attempts are exhausted
