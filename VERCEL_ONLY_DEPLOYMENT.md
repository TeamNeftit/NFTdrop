# 🚀 VERCEL-ONLY DEPLOYMENT GUIDE

## ✅ FIXED: OAuth State Management for Serverless

**Problem:** Vercel serverless functions are stateless - they lose memory between requests.

**Solution:** Store OAuth states in Supabase database instead of memory!

---

## 📋 STEP-BY-STEP SETUP

### **Step 1: Create OAuth States Table in Supabase**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `CREATE_OAUTH_STATES_TABLE.sql`
6. Click **Run** button
7. You should see: "Success. No rows returned"

**What this does:**
- Creates `oauth_states` table to store OAuth state parameters
- Adds indexes for fast lookups
- Sets up automatic cleanup of expired states
- Enables Row Level Security

### **Step 2: Verify Table Creation**

1. In Supabase Dashboard, go to **Table Editor**
2. You should see `oauth_states` table
3. Columns: `id`, `state_key`, `state_data`, `created_at`, `expires_at`

---

## 🔧 **Step 3: Update Environment Variables in Vercel**

1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Make sure ALL these are set:

```env
BASE_URL=https://your-vercel-app.vercel.app
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/x/callback
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=1369232763709947914
DISCORD_INVITE_LINK=https://discord.com/invite/Xc54PrHv7w
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEFTIT_X_USERNAME=neftitxyz
```

**IMPORTANT:** Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct!

---

## 📦 **Step 4: Rebuild and Deploy**

### **Option A: Auto-Deploy (Recommended)**
```bash
git add .
git commit -m "Fix OAuth for Vercel serverless"
git push origin NFTDROP
```

Vercel will automatically detect the push and redeploy!

### **Option B: Manual Deploy**
1. Go to Vercel Dashboard
2. Click **Deployments**
3. Click **Redeploy** on latest deployment

---

## 🔐 **Step 5: Update OAuth Portals**

### **X (Twitter) Developer Portal**
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Go to **User authentication settings**
4. **Callback URLs** - Make sure it has:
   ```
   https://your-vercel-app.vercel.app/auth/x/callback
   ```
5. **Website URL** - Set to:
   ```
   https://your-vercel-app.vercel.app
   ```
6. Click **Save**

### **Discord Developer Portal**
1. Go to: https://discord.com/developers/applications
2. Select your application
3. Go to **OAuth2** → **General**
4. **Redirects** - Make sure it has:
   ```
   https://your-vercel-app.vercel.app/auth/discord/callback
   ```
5. Click **Save Changes**

---

## ✅ **Step 6: Test Everything**

### **Test 1: Check Backend is Running**
Visit: `https://your-vercel-app.vercel.app/api/config`

Should return JSON like:
```json
{
  "discordInviteLink": "https://discord.com/invite/Xc54PrHv7w",
  "neftitUsername": "neftitxyz",
  "discordGuildId": "1369232763709947914",
  "baseUrl": "https://your-vercel-app.vercel.app"
}
```

### **Test 2: Discord OAuth**
1. Go to your Vercel site
2. Open browser console (F12)
3. Click **Connect Discord**
4. Should open Discord authorization
5. Authorize the app
6. Should redirect back successfully
7. Discord username should appear
8. **NO MORE "Invalid state parameter" error!** ✅

### **Test 3: X OAuth**
1. Click **Connect X**
2. Authorize X
3. Should redirect back successfully
4. X username should appear

### **Test 4: Full Flow**
1. Connect Discord ✅
2. Connect X ✅
3. Generate referral link ✅
4. Submit wallet address ✅

---

## 🎯 **How It Works Now**

### **Before (Broken):**
```
User clicks "Connect Discord"
    ↓
Vercel Function generates state → Stores in memory
    ↓
Discord redirects back
    ↓
Different Vercel Function instance (no memory!) ❌
    ↓
"Invalid state parameter" error
```

### **After (Working):**
```
User clicks "Connect Discord"
    ↓
Vercel Function generates state → Stores in Supabase ✅
    ↓
Discord redirects back
    ↓
Different Vercel Function instance
    ↓
Reads state from Supabase ✅
    ↓
OAuth works perfectly! 🎉
```

---

## 🔍 **Troubleshooting**

### **Issue: Still getting "Invalid state parameter"**
**Solutions:**
1. Check Supabase table was created: Go to Table Editor → oauth_states
2. Check environment variables are set in Vercel
3. Redeploy after adding variables
4. Clear browser cache and try again

### **Issue: "oauth_states table does not exist"**
**Solution:**
1. Go to Supabase SQL Editor
2. Run `CREATE_OAUTH_STATES_TABLE.sql` again
3. Verify table appears in Table Editor

### **Issue: OAuth redirects to wrong URL**
**Solution:**
1. Check `BASE_URL` in Vercel environment variables
2. Must match exactly: `https://your-vercel-app.vercel.app` (no trailing slash)
3. Update X and Discord portals with exact same URL

### **Issue: "Supabase not available"**
**Solution:**
1. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel
2. Make sure they're not placeholder values
3. Get correct values from Supabase Dashboard → Settings → API

---

## 📊 **Architecture**

```
┌─────────────────────────────────────────┐
│         Vercel (Frontend + Backend)     │
│                                         │
│  Frontend (React)                       │
│      ↓                                  │
│  Backend (Serverless Functions)         │
│      ↓                                  │
│  OAuth State → Supabase (oauth_states)  │
│      ↓                                  │
│  User Data → Supabase (users table)     │
└─────────────────────────────────────────┘
```

---

## 🎉 **Summary**

**What Changed:**
- ✅ OAuth states now stored in Supabase instead of memory
- ✅ Works perfectly with Vercel serverless functions
- ✅ No need for Railway or separate backend
- ✅ Everything runs on Vercel!

**What You Need to Do:**
1. ✅ Create `oauth_states` table in Supabase
2. ✅ Verify environment variables in Vercel
3. ✅ Push code to GitHub (auto-deploys)
4. ✅ Update OAuth portals
5. ✅ Test and launch!

---

## 🚀 **Ready to Deploy!**

1. Create Supabase table (2 minutes)
2. Push to GitHub (1 minute)
3. Update OAuth portals (2 minutes)
4. Test (1 minute)
5. **LAUNCH!** 🎉

**Your site will work perfectly on Vercel only!** ✅
