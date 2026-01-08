# Comprehensive Billing System Tests

This directory contains comprehensive tests for the entire billing functionality of the application. The tests are designed to cover all aspects of the billing system, from subscription creation to payment processing, recovery mechanisms, and edge cases.

## Test Structure

### 1. **Comprehensive API Tests** (`comprehensive-billing.test.ts`)
- **Billing Plans API**: Testing plan retrieval and error handling
- **Subscription Creation Flow**: Complete subscription creation with payment initialization
- **Webhook Processing**: Handling various Paystack webhook events
- **Subscription Status Checking**: Manual status verification and activation
- **Subscription Recovery**: Payment reference recovery and unlinked payment linking
- **Subscription Cancellation**: Both immediate and end-of-period cancellation
- **Authentication & Authorization**: Security testing for all endpoints
- **Error Handling**: Database errors, API failures, malformed requests
- **Edge Cases**: Race conditions, concurrent requests, webhook replays

### 2. **Integration Tests** (`../integration/billing-flow.test.ts`)
- **Complete Subscription Flow**: End-to-end happy path testing
- **Recovery Scenarios**: Webhook failures and manual recovery
- **Renewal Processing**: Successful and failed subscription renewals
- **Cancellation Workflows**: Different cancellation scenarios
- **Error Recovery**: Partial failures and system resilience
- **Data Consistency**: Referential integrity and orphaned payment handling

### 3. **Unit Tests** (`../lib/subscription-manager.test.ts`)
- **Subscription Activation**: Distributed locking, idempotency, race conditions
- **Payment Processing**: Creation, updates, and Paystack integration
- **Cancellation Logic**: Status-based cancellation rules
- **Error Scenarios**: Lock failures, database errors, invalid states

## Test Coverage Areas

### Core Functionality
- ✅ Subscription creation and payment initialization
- ✅ Payment webhook processing (success/failure)
- ✅ Subscription status checking and activation
- ✅ Payment recovery and linking mechanisms
- ✅ Subscription cancellation (immediate/scheduled)
- ✅ Subscription renewals and billing cycles

### Error Handling & Edge Cases
- ✅ Database connection failures
- ✅ Paystack API errors and timeouts
- ✅ Malformed webhook payloads
- ✅ Invalid payment references
- ✅ Concurrent subscription operations
- ✅ Webhook replay attacks
- ✅ Orphaned payment recovery

### Security & Authentication
- ✅ Unauthorized access prevention
- ✅ User data isolation
- ✅ Webhook signature validation
- ✅ Input validation and sanitization

### System Reliability
- ✅ Distributed locking mechanisms
- ✅ Idempotency for duplicate operations
- ✅ Race condition prevention
- ✅ Data consistency maintenance
- ✅ Transaction rollback scenarios

## Running the Tests

### Quick Start
```bash
# Run all billing tests
node test-billing.js

# Run specific test types
node test-billing.js unit
node test-billing.js integration
node test-billing.js api
```

### Using Vitest Directly
```bash
# Run all billing tests
npx vitest run __tests__/billing/ __tests__/integration/billing-flow.test.ts __tests__/lib/subscription-manager.test.ts __tests__/api/billing.test.ts

# Run with coverage
npx vitest run --coverage __tests__/billing/

# Run in watch mode for development
npx vitest __tests__/billing/comprehensive-billing.test.ts
```

### Using the Test Runner
```bash
# Run comprehensive test suite with detailed reporting
npx ts-node __tests__/billing/run-billing-tests.ts
```

## Test Scenarios Covered

### 1. Happy Path Scenarios
- User creates subscription → Payment succeeds → Webhook activates subscription
- User checks status → System finds recent payment → Activates subscription
- User provides payment reference → System verifies and activates
- User cancels subscription → System schedules cancellation appropriately

### 2. Recovery Scenarios
- Payment succeeds but webhook fails → Manual status check recovers
- Payment reference provided → System verifies with Paystack and activates
- Unlinked payments exist → System finds and links most recent payment
- Multiple recovery attempts → Idempotency prevents duplicate processing

### 3. Error Scenarios
- Invalid plan ID → Appropriate error response
- Duplicate subscription → Prevention and error handling
- Paystack API failure → Graceful degradation
- Database errors → Proper error responses and logging
- Invalid webhook signatures → Request rejection

### 4. Edge Cases
- Concurrent subscription creation → Race condition handling
- Webhook replay attacks → Duplicate prevention
- Orphaned payments → Recovery and linking
- Status changes during processing → Transaction safety
- Lock acquisition failures → Timeout handling

## Mock Strategy

The tests use comprehensive mocking to isolate the billing system:

- **Database (Prisma)**: Mocked to simulate various data states and errors
- **Paystack API**: Mocked to test different response scenarios
- **Authentication**: Mocked to test authorized and unauthorized access
- **Distributed Locks**: Mocked to test lock acquisition success/failure
- **Idempotency**: Mocked to test cache hits and misses

## Test Data Patterns

### Standard Test User
```typescript
const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe'
}
```

### Standard Test Plan
```typescript
const mockPlan = {
  id: 'plan-pro',
  name: 'Pro Plan',
  price: 2900, // NGN 29.00
  currency: 'NGN',
  interval: 'monthly'
}
```

### Standard Test Subscription
```typescript
const mockSubscription = {
  id: 'sub-123',
  userId: 'user-123',
  planId: 'plan-pro',
  status: 'incomplete' // or 'active', 'cancelled', etc.
}
```

## Debugging Failed Tests

### Common Issues
1. **Mock Setup**: Ensure all required mocks are properly configured
2. **Async Operations**: Check that all promises are properly awaited
3. **Test Isolation**: Verify that tests don't interfere with each other
4. **Data Consistency**: Ensure mock data relationships are correct

### Debug Commands
```bash
# Run single test with verbose output
npx vitest run __tests__/billing/comprehensive-billing.test.ts --reporter=verbose

# Run with debug logging
DEBUG=* npx vitest run __tests__/billing/

# Run specific test case
npx vitest run -t "should create subscription and initialize payment"
```

## Extending the Tests

### Adding New Test Cases
1. Identify the scenario to test
2. Create appropriate mocks for the scenario
3. Write the test following existing patterns
4. Ensure proper cleanup and isolation
5. Add documentation for the new test case

### Test Categories
- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test complete workflows end-to-end
- **API Tests**: Test HTTP endpoints and request/response handling
- **Error Tests**: Test error conditions and edge cases

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Billing Tests
  run: |
    npm install
    node test-billing.js all
```

The tests will exit with code 0 on success and code 1 on failure, making them suitable for automated testing environments.

## Performance Considerations

- Tests use mocking to avoid external API calls
- Database operations are mocked for speed
- Parallel test execution is supported
- Test isolation prevents interference
- Cleanup is automatic through mocking

## Security Testing

The tests include security-focused scenarios:
- Unauthorized access attempts
- Invalid webhook signatures
- User data isolation
- Input validation
- SQL injection prevention (through Prisma)

## Maintenance

### Regular Updates Needed
- Update test data when schema changes
- Add tests for new billing features
- Update mocks when external APIs change
- Review and update error scenarios
- Maintain test documentation

### Best Practices
- Keep tests focused and isolated
- Use descriptive test names
- Mock external dependencies
- Test both success and failure paths
- Maintain good test coverage
- Document complex test scenarios