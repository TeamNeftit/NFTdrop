# 🚀 QUICK START - Referral System

## ⚡ 3 Steps to Enable Referrals

### **Step 1: Run SQL Migration** (2 minutes)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project: `snkeusvyeztkpktxnxnr`
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. Copy and paste from `add-referral-system.sql`
6. Click **"Run"** button

**What this does:**
- Adds `referral_code` column
- Adds `referred_by` column  
- Adds `referral_count` column
- Adds `referral_completed_count` column
- Creates indexes for fast lookups
- Generates referral codes for existing users

### **Step 2: Restart Server** (10 seconds)

```bash
# In your terminal where server is running:
# Press Ctrl+C to stop

# Then start again:
node server.js

# Wait for:
# "Supabase client initialized successfully"
# "OAuth server running on port 3001"
```

### **Step 3: Test It!** (2 minutes)

1. **Complete all tasks:**
   - Connect Discord
   - Join Discord server
   - Verify join
   - Connect X
   - Follow X
   - Submit wallet address

2. **Check referral section:**
   - Scroll down to "REFER A FRIEND"
   - Should see referral link input
   - Should see "COPY" button
   - Should see "Referrals: 0"

3. **Copy and test:**
   - Click "COPY" button
   - Open incognito window
   - Paste link and visit
   - Connect Discord as new user
   - Should see: "Referral code applied!"

4. **Complete tasks as new user:**
   - Complete all 3 tasks
   - Submit wallet

5. **Check original user:**
   - Refresh page
   - Referral count should be: **1** 🎉

---

## 🎯 What You'll See

### **Before Completing Tasks:**
```
REFER A FRIEND
Share the link with your friends and get rewards

🔒 Complete all tasks to unlock your referral link
```

### **After Completing Tasks:**
```
REFER A FRIEND
Share the link with your friends and get rewards

┌────────────────────────────────┬──────┐
│ http://localhost:3000?ref=ABC  │ COPY │
└────────────────────────────────┴──────┘

Referrals: 0
```

### **After Friend Completes:**
```
Referrals: 1  ← Updated!
```

---

## ✅ Checklist

- [ ] SQL migration run in Supabase
- [ ] Server restarted
- [ ] Completed all 3 tasks
- [ ] Referral link visible
- [ ] Copy button works
- [ ] Tested with incognito window
- [ ] Referral count increases

---

## 🐛 Troubleshooting

### **"Referral link not showing"**
- ✅ Did you complete ALL 3 tasks?
- ✅ Did you submit wallet address?
- ✅ Did you restart the server?
- ✅ Check console for errors

### **"Copy button not working"**
- ✅ Try clicking again
- ✅ Check browser permissions
- ✅ Manually select and copy text

### **"Referral count not increasing"**
- ✅ Did friend complete ALL tasks?
- ✅ Did friend submit wallet?
- ✅ Check server console logs
- ✅ Refresh page to see updated count

### **"Invalid referral code error"**
- ✅ Check SQL migration ran successfully
- ✅ Check `referral_code` column exists
- ✅ Check user has referral code in database

---

## 📊 Verify in Database

Run this in Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'referral%';

-- Should return:
-- referral_code
-- referred_by
-- referral_count
-- referral_completed_count
```

```sql
-- Check your referral info
SELECT 
    discord_username,
    referral_code,
    referral_completed_count,
    wallet_address
FROM users
WHERE discord_provider_id = 'YOUR_DISCORD_ID';
```

---

## 🎉 Success Indicators

You'll know it's working when you see:

**In Browser Console:**
```
✅ Referral link unlocked: http://localhost:3000?ref=B1CC3475
📊 Referral count: 0
✅ Referral link copied: http://localhost:3000?ref=B1CC3475
```

**In Server Console:**
```
✅ Referral code applied successfully
✅ Referral completed - referrer count updated
```

**In UI:**
- Referral link input field with your unique link
- COPY button that changes to "✓ COPIED"
- Referral count that updates when friends complete

---

**That's it! Your referral system is ready!** 🚀

Share your link and watch the referrals grow! 📈
