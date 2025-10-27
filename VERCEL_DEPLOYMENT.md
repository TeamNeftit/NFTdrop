# 🚀 VERCEL DEPLOYMENT GUIDE - FULL STACK

## ⚠️ IMPORTANT: You Need Backend Running!

Your frontend is on Vercel, but **backend is missing**. That's why nothing works!

---

## 🎯 RECOMMENDED: SEPARATE BACKEND (EASIEST)

### **Option 1: Railway (Best for Backend)**

#### **Step 1: Deploy Backend to Railway**
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your NFTdrop-1 repository
5. Railway auto-detects Node.js ✅

#### **Step 2: Add Environment Variables**
In Railway dashboard, go to Variables tab and add:

```env
BASE_URL=https://your-vercel-app.vercel.app
PORT=3001
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/x/callback
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=1369232763709947914
DISCORD_INVITE_LINK=https://discord.gg/your_invite
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
NEFTIT_X_USERNAME=neftitxyz
```

#### **Step 3: Deploy**
- Railway will automatically deploy
- You'll get a URL like: `https://neftit-backend.railway.app`

#### **Step 4: Update Frontend to Use Backend**
In your frontend code, update API calls to use Railway URL:
- Change API base URL to: `https://neftit-backend.railway.app`

---

## 🔧 ALTERNATIVE: DEPLOY BOTH ON VERCEL

If you want everything on Vercel:

### **Step 1: Redeploy to Vercel**
1. Push `vercel.json` to your GitHub repo
2. Go to Vercel dashboard
3. Redeploy your project

### **Step 2: Add Environment Variables in Vercel**
Go to Project Settings → Environment Variables and add ALL:

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
DISCORD_INVITE_LINK=https://discord.gg/your_invite
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
NEFTIT_X_USERNAME=neftitxyz
```

### **Step 3: Redeploy**
- Vercel will now deploy both frontend AND backend
- Backend runs as serverless functions

---

## 🎯 QUICK FIX FOR YOUR CURRENT ISSUE

### **Right Now:**
1. **Deploy backend to Railway** (5 minutes)
   - https://railway.app
   - Connect GitHub repo
   - Add environment variables
   - Deploy

2. **Update OAuth Callback URLs**
   - X Developer Portal: Add `https://your-vercel-app.vercel.app/auth/x/callback`
   - Discord Developer Portal: Add `https://your-vercel-app.vercel.app/auth/discord/callback`

3. **Test**
   - Go to your Vercel site
   - Click "Connect Discord"
   - Should work now! ✅

---

## 📊 ARCHITECTURE

### **Current (Not Working):**
```
Vercel (Frontend only)
   ↓
   ❌ No backend = 404 errors
```

### **Fixed (Working):**
```
Vercel (Frontend)
   ↓
Railway (Backend) ✅
   ↓
Supabase (Database) ✅
```

---

## ✅ VERIFICATION CHECKLIST

After deploying backend:

- [ ] Backend deployed to Railway/Render
- [ ] Environment variables set
- [ ] Backend URL is live (test: https://your-backend.railway.app/api/config)
- [ ] Frontend updated to use backend URL
- [ ] OAuth callback URLs updated in X portal
- [ ] OAuth callback URLs updated in Discord portal
- [ ] Test "Connect Discord" button
- [ ] Test "Connect X" button
- [ ] Test referral system
- [ ] Test wallet submission

---

## 🚨 COMMON ISSUES

### **Issue: 404 on /api calls**
**Cause:** Backend not running
**Fix:** Deploy backend to Railway/Render

### **Issue: OAuth redirect error**
**Cause:** Callback URLs don't match
**Fix:** Update X and Discord portals with exact production URLs

### **Issue: Database connection failed**
**Cause:** Missing Supabase credentials
**Fix:** Add SUPABASE_URL and SUPABASE_ANON_KEY to backend environment

---

## 🎉 FINAL SETUP

### **Frontend (Vercel):**
- URL: `https://your-app.vercel.app`
- Serves: React app, static files
- No environment variables needed

### **Backend (Railway):**
- URL: `https://your-app.railway.app`
- Runs: Express server, OAuth, API
- Needs: ALL environment variables

### **Database (Supabase):**
- URL: Your Supabase project URL
- Stores: User data, referrals, wallets

---

## 📞 NEXT STEPS

1. **Deploy backend to Railway NOW** ⏰
2. Add all environment variables
3. Update OAuth portals
4. Test everything
5. Launch! 🚀

**Railway is FREE for small projects!**

---

**Need help? Check Railway docs: https://docs.railway.app**
