# Subscription Email Notifications

This document explains the subscription email notification system implemented for SecureUploadHub.

## Overview

The system automatically sends email notifications for various subscription events:

- **Subscription Activated**: When a user's subscription becomes active
- **Subscription Cancelled**: When a user cancels their subscription
- **Payment Failed**: When a subscription payment fails
- **Subscription Renewed**: When a subscription is successfully renewed
- **Subscription Expired**: When a subscription expires and account is downgraded

## Email Templates

All email templates are located in the `emails/` directory:

- `SubscriptionActivatedEmail.tsx` - Welcome email for new subscribers
- `SubscriptionCancelledEmail.tsx` - Confirmation when subscription is cancelled
- `PaymentFailedEmail.tsx` - Alert when payment fails with retry information
- `SubscriptionRenewedEmail.tsx` - Confirmation of successful renewal
- `SubscriptionExpiredEmail.tsx` - Notification when subscription expires

## Integration Points

### Automatic Triggers

The system automatically sends emails when:

1. **Subscription Activation** (`lib/subscription-manager.ts`)
   - Triggered when `activateSubscription()` completes successfully
   - Includes plan details, features, and next billing date

2. **Subscription Cancellation** (`lib/subscription-manager.ts`)
   - Triggered when `cancelSubscription()` is called
   - Includes access period and reactivation options

3. **Payment Events** (`app/api/billing/webhook/route.ts`)
   - Payment failures trigger retry notifications
   - Successful payments trigger renewal confirmations
   - Webhook events from Paystack automatically trigger emails

### Manual Triggers

#### Scheduled Tasks

Run the subscription email scheduler:

```bash
# Run manually
npm run send-subscription-emails

# Or via cron job (daily at 9 AM)
0 9 * * * cd /path/to/project && npm run send-subscription-emails
```

#### Admin API

Admins can manually trigger email tasks:

```bash
# Get statistics
GET /api/admin/subscription-emails

# Trigger email tasks
POST /api/admin/subscription-emails
```

## Email Functions

### Safe Wrapper Functions

All email functions have "Safe" variants that handle errors gracefully:

```typescript
import { 
  sendSubscriptionActivatedSafe,
  sendSubscriptionCancelledSafe,
  sendPaymentFailedSafe,
  sendSubscriptionRenewedSafe,
  sendSubscriptionExpiredSafe
} from '@/lib/email-templates'

// Example usage
const success = await sendSubscriptionActivatedSafe(
  user.email,
  'Pro Plan',
  29.99,
  'USD',
  nextBillingDate,
  dashboardUrl,
  ['Unlimited portals', '100GB storage'],
  user.name
)
```

### Batch Email Tasks

The `lib/subscription-emails.ts` module provides batch email functions:

```typescript
import { runSubscriptionEmailTasks } from '@/lib/subscription-emails'

// Run all subscription email tasks
const results = await runSubscriptionEmailTasks()
console.log(results)
// {
//   expirationEmails: { sent: 5, failed: 0 },
//   expirationReminders: { sent: 2, failed: 0 },
//   paymentRetryNotifications: { sent: 1, failed: 0 }
// }
```

## Configuration

### Environment Variables

Ensure these environment variables are set:

```env
# Email service (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="SecureUploadHub <noreply@yourdomain.com>"

# Application URLs
NEXTAUTH_URL="https://yourdomain.com"
```

### Email Content Customization

To customize email content:

1. Edit the React email templates in `emails/`
2. Update the email subject lines in `lib/email-templates.tsx`
3. Modify the email sending functions as needed

## Monitoring

### Logs

All email sending is logged with detailed information:

```
✅ Subscription activated email sent to user@example.com
❌ Failed to send payment failed email: API rate limit exceeded
```

### Admin Dashboard

Admins can monitor email statistics via:
- GET `/api/admin/subscription-emails` - View pending email counts
- POST `/api/admin/subscription-emails` - Manually trigger email tasks

### Database Tracking

Email events are tracked in the `subscriptionHistory` table:

```sql
SELECT * FROM "SubscriptionHistory" 
WHERE action = 'expiration_email_sent'
ORDER BY "createdAt" DESC;
```

## Error Handling

The system includes comprehensive error handling:

1. **Graceful Degradation**: Failed emails don't block subscription operations
2. **Retry Logic**: Webhook processing includes retry mechanisms
3. **Logging**: All failures are logged with context
4. **Fallback**: If email service is unavailable, operations continue

## Testing

### Manual Testing

Test individual email templates:

```typescript
// In a test script or admin panel
import { sendSubscriptionActivatedSafe } from '@/lib/email-templates'

await sendSubscriptionActivatedSafe(
  'test@example.com',
  'Pro Plan',
  29.99,
  'USD',
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  'https://app.example.com/dashboard',
  ['Feature 1', 'Feature 2'],
  'Test User'
)
```

### Webhook Testing

Test webhook email triggers using Paystack's webhook testing tools or by creating test subscriptions.

## Best Practices

1. **Async Processing**: All emails are sent asynchronously to avoid blocking user operations
2. **Error Tolerance**: Email failures don't affect core subscription functionality
3. **User Experience**: Emails include clear action buttons and helpful information
4. **Compliance**: All emails include unsubscribe information and company details
5. **Monitoring**: Regular monitoring ensures email delivery issues are caught early

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check `RESEND_API_KEY` is valid
   - Verify `EMAIL_FROM` domain is verified in Resend
   - Check application logs for error details

2. **Wrong email content**
   - Verify user data is correctly passed to email functions
   - Check email template props match function parameters

3. **Duplicate emails**
   - Webhook idempotency prevents most duplicates
   - Check for multiple webhook endpoints or retry logic issues

### Debug Mode

Enable detailed email logging by setting:

```env
NODE_ENV=development
```

This will log email content and sending attempts for debugging.