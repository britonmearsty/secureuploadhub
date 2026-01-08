# Subscription Race Condition Fix

## Problem Summary

Users were experiencing an issue where:
1. Payment succeeded and showed "Payment successful. Your subscription is active."
2. But subscription status remained "incomplete" in the database
3. Cancellation failed with "No active subscription found"

## Root Cause Analysis

The issue was caused by **race conditions** in the subscription activation system:

### Multiple Activation Paths
- **Webhook handler** (`charge.success`) - Primary activation path
- **Payment verification endpoint** - Client-side verification
- **Invoice webhook** (`invoice.payment_succeeded`) - Secondary activation
- **Manual status sync** - Admin/user triggered

### Race Condition Scenarios
1. **Concurrent Webhooks**: Paystack sends multiple events simultaneously
2. **Webhook vs Verification**: Frontend calls verification while webhook is processing
3. **Duplicate Events**: Same webhook delivered multiple times
4. **Out-of-order Events**: Events arrive in unexpected sequence

### State Inconsistencies
- Multiple handlers updating subscription status concurrently
- Payment records created multiple times
- Subscription periods calculated differently
- Database transactions not properly isolated

## Solution Implementation

### 1. Centralized Subscription Manager (`lib/subscription-manager.ts`)

Created a single source of truth for all subscription operations:

```typescript
export async function activateSubscription(params: ActivateSubscriptionParams)
export async function cancelSubscription(userId: string)
```

**Key Features:**
- **Distributed Locking**: Prevents concurrent activation of same subscription
- **Idempotency Protection**: Prevents duplicate processing of same payment
- **Atomic Transactions**: Ensures consistent state updates
- **Comprehensive Validation**: Checks subscription status before activation
- **Audit Trail**: Logs all state changes for debugging

### 2. Race Condition Prevention

**Distributed Locking:**
```typescript
const lockKey = `subscription:activate:${subscriptionId}`
const lock = new DistributedLock(lockKey)
const acquired = await lock.acquire(30000) // 30 second timeout
```

**Idempotency Keys:**
```typescript
const idempotencyKey = `activate_subscription:${subscriptionId}:${paymentReference}`
return await withIdempotency(idempotencyKey, async () => {
  return await _activateSubscriptionInternal(params)
}, 300) // 5 minute cache
```

**Status Validation:**
```typescript
// Double-check status within transaction
const currentSub = await tx.subscription.findUnique({
  where: { id: subscriptionId },
  select: { status: true }
})

if (!currentSub || currentSub.status !== SUBSCRIPTION_STATUS.INCOMPLETE) {
  throw new Error(`Subscription status changed during activation`)
}
```

### 3. Updated Integration Points

**Webhook Handler (`app/api/billing/webhook/route.ts`):**
- All subscription activations now use `activateSubscription()`
- Removed duplicate activation logic
- Added proper error handling and logging

**Payment Verification (`app/api/billing/verify-payment/route.ts`):**
- Uses centralized activation for incomplete subscriptions
- Prevents race with webhook processing
- Returns consistent response format

**Subscription Cancellation (`app/api/billing/subscription/route.ts`):**
- Uses centralized `cancelSubscription()` function
- Proper validation and error handling
- Atomic transaction for state updates

### 4. Enhanced Utilities

**Distributed Lock (`lib/distributed-lock.ts`):**
- Complete implementation with acquire/release/extend methods
- Automatic cleanup of expired locks
- Retry logic with exponential backoff

**Idempotency System (`lib/idempotency.ts`):**
- `withIdempotency()` wrapper function
- Automatic result caching and retrieval
- TTL-based cache expiration

## Testing Strategy

### 1. Concurrent Activation Test
```javascript
// Simulate 3 concurrent activation attempts
const promises = [
  activateSubscription({ source: 'webhook' }),
  activateSubscription({ source: 'verification' }),
  activateSubscription({ source: 'manual' })
]
```

**Expected Result:** Exactly one activation succeeds, others return "already_active"

### 2. Duplicate Webhook Test
```javascript
// Send same webhook payload multiple times
for (let i = 0; i < 3; i++) {
  await handleChargeSuccess(samePaymentData)
}
```

**Expected Result:** First call activates, subsequent calls are idempotent

### 3. Out-of-Order Events Test
```javascript
// Send events in wrong order
await handleChargeSuccess(paymentData)      // Should activate
await handleSubscriptionCreate(subData)     // Should be ignored
```

**Expected Result:** Subscription remains active, no state corruption

## Deployment Checklist

### Pre-Deployment
- [ ] Review all code changes
- [ ] Run unit tests for subscription manager
- [ ] Test concurrent activation scenarios
- [ ] Verify webhook signature validation
- [ ] Check database transaction isolation

### Post-Deployment Monitoring
- [ ] Monitor subscription activation success rate
- [ ] Watch for "lock_timeout" errors in logs
- [ ] Check for duplicate payment records
- [ ] Verify cancellation functionality
- [ ] Monitor webhook processing latency

### Rollback Plan
If issues occur:
1. Revert webhook handler changes
2. Restore original activation logic
3. Monitor for immediate improvement
4. Investigate and fix issues offline

## Performance Considerations

### In-Memory Limitations
- Current implementation uses in-memory locks and cache
- **Single instance only** - not suitable for multi-server deployments
- Locks and cache lost on server restart

### Production Recommendations
1. **Implement Redis-based locking** for multi-instance deployments
2. **Add monitoring** for lock contention and timeout rates
3. **Implement circuit breakers** for Paystack API failures
4. **Add reconciliation job** to detect and fix inconsistencies

## Monitoring and Alerting

### Key Metrics to Track
- Subscription activation success rate
- Lock acquisition timeout rate
- Duplicate webhook detection rate
- Payment verification latency
- Subscription cancellation success rate

### Alert Conditions
- Lock timeout rate > 5%
- Activation failure rate > 1%
- Duplicate payment creation detected
- Webhook processing time > 30 seconds
- Subscription status inconsistencies found

## Future Improvements

### Short-term (Next Sprint)
1. Add comprehensive unit tests
2. Implement webhook replay mechanism
3. Add subscription status reconciliation job
4. Improve error messages and user feedback

### Medium-term (Next Quarter)
1. Migrate to Redis for distributed locking
2. Implement event sourcing for subscription state
3. Add real-time subscription status updates
4. Implement automatic retry for failed activations

### Long-term (Next 6 Months)
1. Implement saga pattern for complex workflows
2. Add subscription analytics and reporting
3. Implement A/B testing for payment flows
4. Add machine learning for fraud detection

## Conclusion

This fix addresses the core race condition issues in the subscription system by:

1. **Centralizing** all subscription operations through a single manager
2. **Preventing** concurrent modifications with distributed locking
3. **Ensuring** idempotency to handle duplicate events safely
4. **Maintaining** data consistency with atomic transactions
5. **Providing** comprehensive logging and audit trails

The solution is backward-compatible and can be deployed without downtime. Users should no longer experience the "payment succeeded but subscription incomplete" issue.