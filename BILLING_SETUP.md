# 💳 Billing System Setup Guide

## 🚀 Quick Setup

### 1. Environment Variables

**Local (.env):**
```env
PAYSTACK_PUBLIC_KEY="pk_test_your_public_key"
PAYSTACK_SECRET_KEY="sk_test_your_secret_key"
PAYSTACK_WEBHOOK_SECRET="wh_test_your_webhook_secret"
```

**Vercel Environment Variables:**
- Set the same values in Vercel Dashboard → Settings → Environment Variables
- Ensure they're enabled for Production environment

### 2. Paystack Dashboard Configuration

**Webhook Setup:**
1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/billing/webhook`
3. Enable these events:
   - `charge.success`
   - `subscription.create`
   - `subscription.enable`
   - `subscription.disable`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to your environment variables

## 🧪 Testing

**Run comprehensive test:**
```bash
npx tsx scripts/test-complete-billing-flow.ts
```

**Test webhook specifically:**
```bash
npx tsx scripts/test-webhook-secret.ts
```

## 🔄 Payment Flow

1. **User initiates payment** → Frontend calls `/api/billing/subscription`
2. **Subscription created** → Status: `incomplete`
3. **User completes payment** → Paystack processes payment
4. **Webhook notification** → Paystack sends to `/api/billing/webhook`
5. **Signature validation** → Webhook secret validates authenticity
6. **Subscription activation** → Status: `incomplete` → `active`

## 🛠️ Troubleshooting

**Subscriptions stuck in incomplete:**
- Check webhook secret is correct
- Verify webhook URL in Paystack dashboard
- Check Vercel logs for webhook errors

**500 errors on subscription creation:**
- Check database connection
- Verify Paystack API keys
- Check Vercel environment variables

**Webhook signature validation fails:**
- Ensure webhook secret matches Paystack dashboard
- Check environment variable is set in Vercel
- Verify webhook URL is correct

## 📊 Monitoring

**Check subscription status:**
```bash
npx tsx scripts/fix-incomplete-subscriptions.ts
```

**Manual activation (emergency):**
```bash
npx tsx scripts/manually-activate-subscriptions.ts
```

## 🔒 Security

- Webhook signature validation is enabled by default
- All payment data is validated before processing
- Duplicate webhook events are automatically filtered
- Failed webhooks are retried with exponential backoff

## 🎯 Key Files

- **Main webhook:** `app/api/billing/webhook/route.ts`
- **Subscription API:** `app/api/billing/subscription/route.ts`
- **Webhook validation:** `lib/webhook-validation.ts`
- **Payment processing:** `lib/subscription-manager.ts`