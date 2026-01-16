# 🔍 External Webhook Issues Investigation Plan

## Problem Statement
User pays successfully via Paystack, but subscription status remains "incomplete" instead of "active".
Code review confirms the implementation is correct, so the issue is EXTERNAL.

---

## 🎯 Investigation Checklist

### 1️⃣ **Paystack Dashboard Configuration** (MOST LIKELY ISSUE)

#### A. Webhook URL Configuration
**Check in Paystack Dashboard → Settings → Webhooks**

- [ ] Is webhook URL registered?
- [ ] Is the URL correct: `https://secureuploadhub.vercel.app/api/billing/webhook`
- [ ] Is the webhook ACTIVE/ENABLED?
- [ ] Are the correct events selected?

**Required Events:**
- ✅ `charge.success` (CRITICAL - this activates subscriptions)
- ✅ `subscription.create`
- ✅ `subscription.enable`
- ✅ `subscription.disable`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

**Common Mistakes:**
- ❌ Webhook URL not registered at all
- ❌ Wrong URL (http instead of https, wrong domain, typo)
- ❌ Webhook disabled/inactive
- ❌ `charge.success` event not selected

#### B. Webhook Secret
**Check in Paystack Dashboard → Settings → Webhooks**

- [ ] Is the webhook secret shown in dashboard?
- [ ] Does it match `PAYSTACK_WEBHOOK_SECRET` in `.env`?

**Current Configuration:**
```
PAYSTACK_WEBHOOK_SECRET=sk_test_f8ffaabde856d6f5a8b30ea0c9edfd84bc195505
```

**Note:** This should be the same as `PAYSTACK_SECRET_KEY` ✅ (Currently correct)

---

### 2️⃣ **Webhook Delivery Status** (CHECK PAYSTACK LOGS)

**Go to: Paystack Dashboard → Developers → Webhooks → Logs**

#### Check Recent Webhook Attempts:
- [ ] Are webhooks being SENT by Paystack?
- [ ] What is the HTTP status code returned?
  - ✅ 200 = Success
  - ❌ 400 = Bad Request (signature validation failed)
  - ❌ 401 = Unauthorized
  - ❌ 404 = Not Found (wrong URL)
  - ❌ 500 = Server Error
  - ❌ 503 = Service Unavailable

#### Check Webhook Payload:
- [ ] Does the payload contain `charge.success` event?
- [ ] Does it have the correct `reference`?
- [ ] Does it have `metadata` with `subscription_id`?

**What to Look For:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "sub_cmk..._...",
    "status": "success",
    "metadata": {
      "subscription_id": "cmk...",
      "type": "subscription_setup"
    }
  }
}
```

---

### 3️⃣ **Vercel Deployment Issues**

#### A. Function Timeout
**Check: Vercel Dashboard → Project → Functions**

- [ ] Is the webhook function timing out?
- [ ] Default timeout: 10 seconds (Hobby plan)
- [ ] Is database query taking too long?

**Solution if timing out:**
- Upgrade Vercel plan for longer timeouts
- Optimize database queries
- Add indexes to database

#### B. Function Logs
**Check: Vercel Dashboard → Project → Logs**

Search for:
- [ ] "Processing webhook event: charge.success"
- [ ] "Webhook signature validated successfully"
- [ ] "Subscription activated successfully"
- [ ] Any error messages

**Common Errors:**
- ❌ "Invalid Paystack webhook signature"
- ❌ "Database connection timeout"
- ❌ "Failed to acquire lock"

#### C. Environment Variables
**Check: Vercel Dashboard → Project → Settings → Environment Variables**

- [ ] Are all environment variables set?
- [ ] Is `PAYSTACK_WEBHOOK_SECRET` set correctly?
- [ ] Is `DATABASE_URL` accessible from Vercel?
- [ ] Did you redeploy after changing env vars?

**CRITICAL:** Environment variable changes require redeployment!

---

### 4️⃣ **Network/Firewall Issues**

#### A. Paystack IP Whitelist
- [ ] Does your hosting provider block Paystack IPs?
- [ ] Is there a firewall blocking webhook requests?

**Paystack Webhook IPs:**
- Check Paystack documentation for current IP ranges
- Whitelist these IPs if your hosting has IP restrictions

#### B. SSL/TLS Certificate
- [ ] Is your SSL certificate valid?
- [ ] Is HTTPS working properly?
- [ ] Test: `curl -I https://secureuploadhub.vercel.app/api/billing/webhook`

---

### 5️⃣ **Database Connection Issues**

#### A. Connection Pool
**Check: Neon Dashboard → Database → Connections**

- [ ] Are there available connections?
- [ ] Is connection pool exhausted?
- [ ] Are there long-running queries?

**Current Config:**
```
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

#### B. Database Latency
- [ ] Is database responding quickly?
- [ ] Check Neon dashboard for query performance
- [ ] Are there any slow queries?

---

### 6️⃣ **Redis Connection Issues**

**Current Config:**
```
REDIS_URL=redis://localhost:6379
```

⚠️ **POTENTIAL ISSUE:** Redis URL points to `localhost`!

**Problem:**
- Vercel serverless functions don't have persistent localhost
- Redis connection will fail in production
- This breaks reference mapping and idempotency

**Solutions:**
1. Use Upstash Redis (serverless-friendly)
2. Use Vercel KV
3. Remove Redis dependency (use database only)

**Check:**
- [ ] Are Redis operations failing silently?
- [ ] Check Vercel logs for Redis connection errors

---

### 7️⃣ **Test Payment vs Live Payment**

#### A. Test Mode Configuration
**Current Keys:**
```
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
```

✅ Using TEST keys (correct for testing)

**Check:**
- [ ] Are you testing with TEST cards?
- [ ] Is Paystack dashboard in TEST mode?
- [ ] Are webhooks configured in TEST mode?

**Paystack Test Cards:**
```
Success: 4084084084084081
Decline: 4084080000000408
```

#### B. Live Mode (When Ready)
- [ ] Switch to LIVE keys
- [ ] Configure webhooks in LIVE mode
- [ ] Test with real card

---

## 🔧 Immediate Action Steps

### Step 1: Check Paystack Webhook Configuration
```bash
# Go to: https://dashboard.paystack.com/#/settings/developer
# Navigate to: Webhooks section
# Verify:
# 1. Webhook URL: https://secureuploadhub.vercel.app/api/billing/webhook
# 2. Status: Active
# 3. Events: charge.success is checked
```

### Step 2: Check Webhook Delivery Logs
```bash
# Go to: https://dashboard.paystack.com/#/developers/webhooks
# Check recent webhook attempts
# Look for HTTP status codes and error messages
```

### Step 3: Check Vercel Function Logs
```bash
# Go to: https://vercel.com/your-project/logs
# Filter by: /api/billing/webhook
# Look for: webhook processing logs
```

### Step 4: Test Webhook Manually
```bash
# Use Paystack's webhook testing tool
# Or use this curl command:

curl -X POST https://secureuploadhub.vercel.app/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: YOUR_SIGNATURE" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref",
      "status": "success",
      "amount": 100000,
      "currency": "USD"
    }
  }'
```

### Step 5: Fix Redis Configuration (CRITICAL)
```bash
# Option 1: Use Upstash Redis
# 1. Sign up at https://upstash.com
# 2. Create Redis database
# 3. Update .env:
REDIS_URL=redis://default:password@endpoint.upstash.io:6379

# Option 2: Remove Redis dependency
# Modify code to use database-only approach
```

---

## 📊 Diagnostic Script

Create a test to verify webhook endpoint is accessible:

```javascript
// test-webhook-accessibility.js
const https = require('https');

const testWebhook = async () => {
  console.log('🔍 Testing Webhook Endpoint Accessibility...\n');
  
  const options = {
    hostname: 'secureuploadhub.vercel.app',
    port: 443,
    path: '/api/billing/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': 'test'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Status Message: ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', data);
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(JSON.stringify({
      event: 'charge.success',
      data: { reference: 'test' }
    }));
    
    req.end();
  });
};

testWebhook();
```

---

## 🎯 Most Likely Issues (Ranked by Probability)

### 1. **Webhook Not Configured in Paystack Dashboard** (90% probability)
- Webhook URL not registered
- Wrong URL registered
- Webhook disabled
- `charge.success` event not selected

### 2. **Redis Connection Failing** (70% probability)
- `REDIS_URL=redis://localhost:6379` won't work on Vercel
- Reference mapping fails
- Idempotency checks fail

### 3. **Webhook Signature Mismatch** (30% probability)
- Wrong secret in Paystack dashboard
- Environment variable not updated in Vercel

### 4. **Vercel Function Timeout** (20% probability)
- Database queries taking too long
- Function exceeds 10-second limit

### 5. **Database Connection Issues** (10% probability)
- Connection pool exhausted
- Neon database unreachable

---

## ✅ Success Indicators

When everything is working, you should see:

1. **In Paystack Dashboard:**
   - Webhook delivery: ✅ 200 OK
   - Event: charge.success
   - Payload delivered successfully

2. **In Vercel Logs:**
   ```
   ✅ Webhook signature validated successfully
   Processing webhook event: charge.success
   Subscription activated successfully: cmk...
   ```

3. **In Database:**
   - Subscription status: "active"
   - Payment status: "succeeded"
   - Payment linked to subscription

4. **In User Dashboard:**
   - Subscription shows as "Active"
   - Plan features unlocked

---

## 📝 Next Steps

1. **Check Paystack Dashboard** (5 minutes)
2. **Check Vercel Logs** (5 minutes)
3. **Fix Redis Configuration** (10 minutes)
4. **Test with new payment** (5 minutes)
5. **Verify subscription activates** (2 minutes)

**Total Time: ~30 minutes**

---

## 🆘 If Still Not Working

Create a detailed report with:
1. Screenshot of Paystack webhook configuration
2. Screenshot of Paystack webhook delivery logs
3. Screenshot of Vercel function logs
4. Database query showing subscription status
5. Payment reference number from test transaction

This will help pinpoint the exact issue.
