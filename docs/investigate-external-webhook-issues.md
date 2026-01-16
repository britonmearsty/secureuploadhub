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

---

### 3️⃣ **Vercel Deployment Issues**

#### A. Function Timeout
**Check: Vercel Dashboard → Project → Functions**

- [ ] Is the webhook function timing out?
- [ ] Default timeout: 10 seconds (Hobby plan)
- [ ] Is database query taking too long?

#### B. Function Logs
**Check: Vercel Dashboard → Project → Logs**

Search for:
- [ ] "Processing webhook event: charge.success"
- [ ] "Webhook signature validated successfully"
- [ ] "Subscription activated successfully"
- [ ] Any error messages

#### C. Environment Variables
**Check: Vercel Dashboard → Project → Settings → Environment Variables**

- [ ] Are all environment variables set?
- [ ] Is `PAYSTACK_SECRET_KEY` set correctly?
- [ ] Is `DATABASE_URL` accessible from Vercel?
- [ ] Did you redeploy after changing env vars?

**CRITICAL:** Environment variable changes require redeployment!

---

### 4️⃣ **Database Connection Issues**

#### A. Connection Pool
**Check: Neon Dashboard → Database → Connections**

- [ ] Are there available connections?
- [ ] Is connection pool exhausted?
- [ ] Are there long-running queries?

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

---

## 🎯 Most Likely Issues (Ranked by Probability)

### 1. **Webhook Not Configured in Paystack Dashboard** (90% probability)
- Webhook URL not registered
- Wrong URL registered
- Webhook disabled
- `charge.success` event not selected

### 2. **Webhook Signature Mismatch** (30% probability)
- Wrong secret in Paystack dashboard
- Environment variable not updated in Vercel

### 3. **Vercel Function Timeout** (20% probability)
- Database queries taking too long
- Function exceeds 10-second limit

### 4. **Database Connection Issues** (10% probability)
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
3. **Test with new payment** (5 minutes)
4. **Verify subscription activates** (2 minutes)

**Total Time: ~20 minutes**
