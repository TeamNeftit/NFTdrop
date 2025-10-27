# ✅ PRODUCTION DEPLOYMENT CHECKLIST

Use this checklist to ensure everything is ready for launch.

---

## 🔧 BEFORE DEPLOYMENT

### Environment Setup
- [ ] Created `.env` file from `.env.example`
- [ ] Set `BASE_URL` to production domain (https://your-domain.com)
- [ ] Set `X_CLIENT_ID` (from X Developer Portal)
- [ ] Set `X_CLIENT_SECRET` (from X Developer Portal)
- [ ] Set `X_REDIRECT_URI` (https://your-domain.com/auth/x/callback)
- [ ] Set `DISCORD_CLIENT_ID` (from Discord Developer Portal)
- [ ] Set `DISCORD_CLIENT_SECRET` (from Discord Developer Portal)
- [ ] Set `DISCORD_REDIRECT_URI` (https://your-domain.com/auth/discord/callback)
- [ ] Set `DISCORD_BOT_TOKEN` (from Discord Developer Portal)
- [ ] Set `DISCORD_GUILD_ID` (already set: 1369232763709947914)
- [ ] Set `DISCORD_INVITE_LINK` (your Discord invite URL)
- [ ] Set `SUPABASE_URL` (from Supabase Dashboard)
- [ ] Set `SUPABASE_ANON_KEY` (from Supabase Dashboard)
- [ ] Set `NEFTIT_X_USERNAME` (default: neftitxyz)

### OAuth Portal Configuration
- [ ] Updated X Developer Portal callback URL to production
- [ ] Updated X Developer Portal website URL to production
- [ ] Updated Discord Developer Portal redirect URL to production
- [ ] Verified Discord bot is in your server
- [ ] Verified Discord bot has proper permissions

### Code Verification
- [ ] All hardcoded localhost URLs removed ✅ (Already fixed!)
- [ ] `.env` file is in `.gitignore` ✅ (Already done!)
- [ ] No API keys in code ✅ (Already verified!)
- [ ] Console logs will be removed in build ✅ (Vite configured!)

---

## 🏗️ BUILD PROCESS

### Frontend Build
- [ ] Run `npm install` to install dependencies
- [ ] Run `npm run build` to create production build
- [ ] Verify `/dist` folder was created
- [ ] Check build completed without errors

### Backend Preparation
- [ ] Ensure `server.js` uses PORT from environment
- [ ] Verify all routes use `BASE_URL` variable
- [ ] Check database connection works

---

## 🚀 DEPLOYMENT

### Frontend Deployment (Choose One)

#### Option A: Vercel
- [ ] Connect GitHub repository to Vercel
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Deploy

#### Option B: Netlify
- [ ] Connect GitHub repository to Netlify
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Deploy

### Backend Deployment (Choose One)

#### Option A: Railway
- [ ] Create new project on Railway
- [ ] Connect GitHub repository
- [ ] Add all environment variables
- [ ] Set start command: `npm start`
- [ ] Deploy

#### Option B: Render
- [ ] Create new Web Service on Render
- [ ] Connect GitHub repository
- [ ] Add all environment variables
- [ ] Set start command: `npm start`
- [ ] Deploy

#### Option C: Heroku
- [ ] Create new app on Heroku
- [ ] Connect GitHub repository
- [ ] Add all environment variables (Config Vars)
- [ ] Deploy

---

## 🧪 POST-DEPLOYMENT TESTING

### X (Twitter) OAuth
- [ ] Click "Connect X" button
- [ ] Redirects to X authorization page
- [ ] After authorization, returns to your site
- [ ] X username displays correctly
- [ ] Follow Neftit verification works
- [ ] Task marks as complete

### Discord OAuth
- [ ] Click "Connect Discord" button
- [ ] Redirects to Discord authorization page
- [ ] After authorization, returns to your site
- [ ] Discord username displays correctly
- [ ] Join server button works
- [ ] Server join detection works
- [ ] Task marks as complete

### Referral System
- [ ] Referral link generates correctly
- [ ] Copy referral link works
- [ ] Share on X button works
- [ ] Open referral link in incognito/private window
- [ ] Complete tasks with referred account
- [ ] Referrer's count increases by 1
- [ ] Referral stats display correctly

### Wallet Submission
- [ ] Complete all 3 tasks (X, Discord, Referral)
- [ ] Wallet input appears
- [ ] Submit valid wallet address
- [ ] Success message displays
- [ ] Tasks lock after submission
- [ ] Cannot change wallet after submission
- [ ] Database stores wallet correctly

### General Functionality
- [ ] Website loads on production domain
- [ ] HTTPS is working (padlock icon)
- [ ] No console errors in browser
- [ ] All images load correctly
- [ ] All animations work smoothly
- [ ] Mobile responsive design works
- [ ] All buttons are clickable
- [ ] No broken links

---

## 🔒 SECURITY VERIFICATION

- [ ] `.env` file NOT committed to git
- [ ] No API keys visible in browser console
- [ ] No API keys in frontend code
- [ ] HTTPS enabled (required for OAuth)
- [ ] CORS configured correctly
- [ ] Rate limiting working (Discord API)
- [ ] Database credentials secure

---

## 📊 MONITORING SETUP

- [ ] Server logs accessible
- [ ] Error tracking setup (optional: Sentry)
- [ ] Analytics setup (optional: Google Analytics)
- [ ] Uptime monitoring (optional: UptimeRobot)
- [ ] Database backups enabled (Supabase auto-backup)

---

## 📱 FINAL CHECKS

### Browser Testing
- [ ] Chrome/Edge (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (Mobile)

### Device Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No layout shift on load
- [ ] Smooth animations
- [ ] Fast API responses

---

## 🎉 LAUNCH READY!

When all items are checked:

- [ ] **FINAL REVIEW**: Double-check all OAuth URLs
- [ ] **BACKUP**: Export database backup from Supabase
- [ ] **ANNOUNCE**: Prepare launch announcement
- [ ] **MONITOR**: Watch logs for first 24 hours
- [ ] **SUPPORT**: Be ready to help users

---

## 🆘 EMERGENCY CONTACTS

**If something goes wrong:**

1. **Check server logs** - Look for error messages
2. **Check browser console** - F12 Developer Tools
3. **Check Supabase logs** - Database errors
4. **Rollback if needed** - Revert to previous version

**Common Issues:**
- OAuth not working → Check callback URLs match exactly
- Discord not detecting → Verify bot token and guild ID
- Database errors → Check Supabase credentials
- CORS errors → Verify BASE_URL is correct

---

## ✅ DEPLOYMENT COMPLETE

**Congratulations!** 🎉

Your NEFTIT NFT Drop is now live in production!

**Next Steps:**
1. Monitor for any issues
2. Collect user feedback
3. Plan future updates
4. Celebrate! 🚀

---

**Launch Date:** _____________

**Deployed By:** _____________

**Production URL:** _____________

**Notes:** _____________________________________________
