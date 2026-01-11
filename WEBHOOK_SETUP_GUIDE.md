# Paystack Webhook Setup Guide

## Current Implementation Status ✅

Your Paystack webhook implementation is **fully functional** and includes:

### 🔧 Webhook Endpoint
- **URL**: `{NEXTAUTH_URL}/api/billing/webhook`
- **Method**: POST
- **Location**: `app/api/billing/webhook/route.ts`

### 🔐 Security Features
- ✅ **Signature Validation**: HMAC SHA512 verification using `PAYSTACK_WEBHOOK_SECRET`
- ✅ **IP Whitelisting Support**: Ready for Paystack IPs (52.31.139.75, 52.49.173.169, 52.214.14.220)
- ✅ **Duplicate Prevention**: In-memory cache prevents duplicate event processing
- ✅ **Retry Logic**: Enhanced retry mechanism with exponential backoff

### 📡 Supported Events
Your webhook handles all major Paystack events:

| Event | Description | Handler Function |
|-------|-------------|------------------|
| `charge.success` | Payment completed successfully | `handleChargeSuccessEnhanced()` |
| `charge.failed` | Payment failed | `handleChargeFailed()` |
| `subscription.create` | New subscription created | `handleSubscriptionCreate()` |
| `subscription.enable` | Subscription reactivated | `handleSubscriptionEnable()` |
| `subscription.disable` | Subscription cancelled | `handleSubscriptionDisable()` |
| `subscription.not_renew` | Subscription set to not renew | `handleSubscriptionNotRenew()` |
| `invoice.payment_succeeded` | Invoice payment successful | `handleInvoicePaymentSucceeded()` |
| `invoice.payment_failed` | Invoice payment failed | `handleInvoicePaymentFailed()` |

### 🧪 Testing Tools Created

1. **`test-webhook-paystack.js`** - Validates webhook configuration and signature
2. **`simulate-webhook-events.js`** - Simulates webhook events for local testing
3. **Test endpoint**: `/api/billing/webhook/test` - For debugging webhook delivery

## 🚀 Setup Instructions

### 1. Environment Variables
Ensure these are set in your `.env` file:
```env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
NEXTAUTH_URL=https://yourdomain.com
```

### 2. Paystack Dashboard Configuration
1. Go to **Settings > Webhooks** in your Paystack dashboard
2. Add webhook URL: `https://yourdomain.com/api/billing/webhook`
3. Select these events:
   - `charge.success`
   - `charge.failed`
   - `subscription.create`
   - `subscription.enable`
   - `subscription.disable`
   - `subscription.not_renew`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. IP Whitelisting (Optional but Recommended)
Configure your server/firewall to only allow webhook requests from:
- `52.31.139.75`
- `52.49.173.169`
- `52.214.14.220`

## 🧪 Testing Your Webhooks

### Test Configuration
```bash
node test-webhook-paystack.js
```

### Simulate Events Locally
```bash
# Run test scenarios
node simulate-webhook-events.js scenarios

# Interactive mode
node simulate-webhook-events.js interactive

# Specific event
node simulate-webhook-events.js charge.success
```

### Test Webhook Delivery
```bash
# Check if webhook endpoint is accessible
curl https://yourdomain.com/api/billing/webhook/test
```

## 🔄 Webhook Flow

### Subscription Setup Flow
1. User initiates subscription → Creates incomplete subscription in DB
2. Payment processed → `charge.success` webhook received
3. Webhook validates signature and finds subscription
4. Subscription activated using `activateSubscription()` function
5. User gets access to features

### Recurring Payment Flow
1. Paystack charges customer → `invoice.payment_succeeded` webhook
2. Webhook updates subscription period and payment record
3. Subscription remains active for next billing cycle

### Failed Payment Flow
1. Payment fails → `invoice.payment_failed` webhook
2. Subscription status changes to `PAST_DUE`
3. Grace period starts (7 days default)
4. Retry attempts tracked

## 🛠️ Advanced Features

### Enhanced Subscription Matching
Your webhook includes sophisticated matching logic:
- **Redis mapping**: Fast lookup by payment reference
- **Metadata matching**: Uses subscription_id in payment metadata
- **Email matching**: Finds subscriptions by customer email
- **Amount matching**: Validates payment amounts
- **Enhanced matching**: Multi-factor subscription identification

### Validation & Verification
- **Signature validation**: Prevents unauthorized webhook calls
- **Data validation**: Ensures webhook data integrity
- **Subscription linking verification**: Prevents incorrect associations
- **Amount validation**: Validates payment amounts match subscription costs

### Error Handling
- **Retryable errors**: Returns 503 for temporary failures
- **Non-retryable errors**: Returns 500 for permanent failures
- **Audit logging**: All webhook events logged for debugging
- **Graceful degradation**: Continues processing even with warnings

## 📊 Monitoring & Debugging

### Logs to Monitor
- Webhook signature validation results
- Subscription matching confidence scores
- Payment amount validation warnings
- Retry attempt outcomes

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid signature | Wrong webhook secret | Verify `PAYSTACK_WEBHOOK_SECRET` |
| No subscription found | Missing metadata or email mismatch | Check payment metadata includes `subscription_id` |
| Amount mismatch | Currency conversion or plan changes | Review amount validation logs |
| Duplicate processing | Webhook retry without deduplication | Check processed events cache |

## 🔧 Customization

### Adding New Event Types
1. Add event handler function in `route.ts`
2. Add case in main webhook processor
3. Update supported events list
4. Add test case in simulator

### Modifying Retry Logic
Edit the `withWebhookRetry` configuration in `/lib/enhanced-webhook-retry.ts`

### Custom Validation Rules
Modify validation functions in `/lib/webhook-validation.ts`

## ✅ Production Checklist

- [ ] Webhook URL configured in Paystack dashboard
- [ ] All environment variables set
- [ ] SSL certificate valid for webhook URL
- [ ] IP whitelisting configured (optional)
- [ ] Webhook events tested with simulator
- [ ] Monitoring/logging configured
- [ ] Error alerting set up
- [ ] Backup webhook URL configured (optional)

## 🆘 Troubleshooting

### Test Webhook Connectivity
```bash
# Test from Paystack dashboard
# Or use webhook testing tools like ngrok for local development
```

### Debug Webhook Issues
1. Check server logs for webhook processing errors
2. Verify signature validation is passing
3. Ensure subscription exists before payment
4. Check payment metadata includes required fields
5. Validate webhook URL is publicly accessible

Your webhook implementation is production-ready with comprehensive error handling, security features, and testing tools! 🎉