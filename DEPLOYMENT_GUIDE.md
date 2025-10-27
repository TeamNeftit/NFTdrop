# 🚀 NEFTIT NFT DROP - PRODUCTION DEPLOYMENT GUIDE

## ⚠️ PRE-DEPLOYMENT CHECKLIST

### 1. Update OAuth Callback URLs

#### X (Twitter) Developer Portal
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Go to "User authentication settings"
4. Add production callback URL:
   - `https://your-production-domain.com/auth/x/callback`
5. Update Website URL to your production domain
6. Save changes

#### Discord Developer Portal
1. Go to: https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → General
4. Add redirect URL:
   - `https://your-production-domain.com/auth/discord/callback`
5. Save changes

---

## 📝 ENVIRONMENT SETUP

### Step 1: Create Production .env File

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

**Required Variables:**
- `BASE_URL` - Your production domain (e.g., https://neftit.xyz)
- `X_CLIENT_ID` - From X Developer Portal
- `X_CLIENT_SECRET` - From X Developer Portal
- `X_REDIRECT_URI` - Must match X portal exactly
- `DISCORD_CLIENT_ID` - From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - From Discord Developer Portal
- `DISCORD_REDIRECT_URI` - Must match Discord portal exactly
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server ID (already set: 1369232763709947914)
- `DISCORD_INVITE_LINK` - Your Discord invite link
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

---

## 🏗️ BUILD PROCESS

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Frontend
```bash
npm run build
```

This creates optimized production files in `/dist` folder with:
- ✅ Minified JavaScript & CSS
- ✅ Console logs removed automatically
- ✅ Optimized assets
- ✅ Source maps for debugging

---

## 🌐 DEPLOYMENT OPTIONS

### Option A: Separate Hosting (Recommended)

#### Frontend (Vercel/Netlify)
1. Deploy `/dist` folder to Vercel or Netlify
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. No environment variables needed for frontend

#### Backend (Railway/Render/Heroku)
1. Deploy entire project
2. Set start command: `npm start`
3. Add all environment variables from `.env`
4. Ensure PORT is set (default: 3001)

### Option B: Single Server Deployment

If hosting both on same server, the backend already serves the frontend from `/dist`.

---

## 🔍 POST-DEPLOYMENT TESTING

### 1. Test X OAuth Flow
- Click "Connect X" button
- Should redirect to X authorization
- After authorization, should return to your site
- Verify follow detection works

### 2. Test Discord OAuth Flow
- Click "Connect Discord" button
- Should redirect to Discord authorization
- After authorization, should return to your site
- Join Discord server and verify detection

### 3. Test Referral System
- Generate referral link
- Open in incognito/private window
- Complete tasks with referred account
- Verify referrer count increases

### 4. Test Wallet Submission
- Complete all 3 tasks
- Submit wallet address
- Verify tasks lock after submission
- Check database for saved data

---

## 🔒 SECURITY CHECKLIST

- [x] `.env` file is in `.gitignore`
- [x] No hardcoded API keys in code
- [x] All URLs use environment variables
- [x] Console logs removed in production build
- [x] HTTPS enabled (required for OAuth)
- [x] CORS configured properly
- [x] Rate limiting enabled (Discord verification)

---

## 📊 MONITORING

### Check Server Logs
```bash
# View real-time logs
tail -f logs/server.log

# Check for errors
grep "ERROR" logs/server.log
```

### Health Check Endpoints
- `/api/config` - Returns public configuration
- `/api/debug/test-discord-bot` - Test Discord bot connection

---

## 🐛 TROUBLESHOOTING

### OAuth Callback Errors
**Problem:** "Redirect URI mismatch"
**Solution:** Ensure callback URLs in X/Discord portals match exactly (including https://)

### Discord Join Not Detected
**Problem:** User joined but not detected
**Solution:** 
1. Check Discord bot has proper permissions
2. Verify bot is in the server
3. Check DISCORD_GUILD_ID is correct
4. User must complete Discord verification (not pending)

### Database Connection Issues
**Problem:** "Database not available"
**Solution:**
1. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
2. Check Supabase project is active
3. Verify database tables exist

---

## 📈 PERFORMANCE OPTIMIZATION

### Already Implemented:
- ✅ Code minification (Terser)
- ✅ Asset optimization
- ✅ Lazy loading for routes
- ✅ Caching for Discord API calls
- ✅ Rate limiting for API endpoints

### Recommended:
- Add CDN for static assets (Cloudflare)
- Enable gzip compression
- Add Redis for session storage (optional)
- Set up database connection pooling

---

## 🔄 UPDATES & MAINTENANCE

### Updating Code
```bash
# Pull latest changes
git pull origin main

# Rebuild frontend
npm run build

# Restart backend
pm2 restart neftit-backend
```

### Database Backups
Supabase provides automatic backups. To manually backup:
1. Go to Supabase Dashboard
2. Database → Backups
3. Download backup

---

## 📞 SUPPORT

### Common Issues
1. **OAuth not working** - Check callback URLs match exactly
2. **Discord not detecting** - Verify bot token and guild ID
3. **Database errors** - Check Supabase credentials
4. **CORS errors** - Verify BASE_URL is correct

### Logs Location
- Server logs: Console output or log file
- Browser logs: Developer Console (F12)
- Database logs: Supabase Dashboard

---

## ✅ DEPLOYMENT COMPLETE!

Your NEFTIT NFT Drop website is now production-ready! 🎉

**Final Checks:**
- [ ] All environment variables set
- [ ] OAuth callback URLs updated
- [ ] Frontend built and deployed
- [ ] Backend running with correct BASE_URL
- [ ] All 4 features tested (X, Discord, Referral, Wallet)
- [ ] HTTPS enabled
- [ ] Monitoring setup

**Launch Time!** 🚀
