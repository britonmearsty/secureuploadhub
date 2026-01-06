# How to See Debug Logs

## Method 1: Local Development (npm run dev)

1. **Start your app locally:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Open your terminal** where the dev server is running

3. **Visit the storage accounts page** in your browser:
   - Go to: `http://localhost:3000/dashboard/settings`
   - Click on the storage/accounts section

4. **Watch the terminal** - you should see logs like:
   ```
   🔍 STORAGE_ACCOUNTS_API: GET request received
   🔍 STORAGE_ACCOUNTS_API: Session check: { hasSession: true, userId: 'abc123' }
   🔍 getConnectedAccounts: Starting for userId: abc123
   🔍 getConnectedAccounts: Found OAuth accounts: 2
   🔍 getConnectedAccounts: Found storage accounts: 2
   ```

## Method 2: If Deployed on Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Find your project

2. **Click on your project** → **Functions** tab

3. **Visit the storage page** in your live app

4. **Go back to Vercel** → **Functions** → Click on any function

5. **Check the "Logs" section** - you'll see the debug output there

## Method 3: Browser Console (for frontend logs)

1. **Open your browser** (Chrome/Firefox/Safari)

2. **Press F12** or right-click → "Inspect Element"

3. **Go to Console tab**

4. **Visit the storage accounts page**

5. **Look for logs starting with:**
   ```
   🔍 DEBUG: Storage accounts API response:
   🔍 DEBUG: All accounts:
   🔍 DEBUG: Connected accounts:
   ```

## Method 4: Quick Test Script

Run this to test the API directly: