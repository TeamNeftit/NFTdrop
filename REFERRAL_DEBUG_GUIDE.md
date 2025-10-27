# 🔍 REFERRAL SYSTEM - COMPLETE DEBUG GUIDE

## 🚨 PROBLEM: Referral count not increasing

---

## ✅ STEP 1: Check Database Columns

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'referral%';
```

**Expected Output:**
```
referral_code              | text
referred_by                | text
referral_count             | integer
referral_completed_count   | integer
```

**If columns are missing:** Run the SQL from `REFERRAL_SQL_STEP_BY_STEP.md`

---

## ✅ STEP 2: Check Your User Data

Replace `YOUR_DISCORD_ID` with your actual Discord ID:

```sql
SELECT 
    discord_username,
    discord_provider_id,
    referral_code,
    referred_by,
    referral_count,
    referral_completed_count,
    discord_joined,
    twitter_provider_id IS NOT NULL as has_twitter,
    wallet_address IS NOT NULL as has_wallet
FROM users
WHERE discord_provider_id = 'YOUR_DISCORD_ID';
```

**Expected for Referrer (User A):**
```
referral_code: CF4BD0DC (or similar)
referred_by: NULL
referral_count: 0 (will increase when friend signs up)
referral_completed_count: 0 (will increase when friend completes tasks)
has_wallet: true
```

**Expected for Friend (User B):**
```
referral_code: NULL or their own code
referred_by: CF4BD0DC (User A's code)
has_wallet: true (after completing tasks)
```

---

## ✅ STEP 3: Test with Debug Tool

1. Open: `http://localhost:3000/test-referral.html`
2. Use the tool to test each step

### **Test 1: Check User A (Referrer)**
- Enter User A's Discord ID
- Click "Check User"
- Should show: `wallet_connected: true`, `referral_code: "CF4BD0DC"`

### **Test 2: Apply Referral (User B)**
- Enter User B's Discord ID
- Enter User A's referral code
- Click "Apply Referral"
- Should show: `success: true`

### **Test 3: Complete Referral (User B)**
- Enter User B's Discord ID
- Click "Complete Referral"
- Should show: `success: true`, `newCount: 1`

### **Test 4: Check User A Again**
- Enter User A's Discord ID
- Click "Get Info"
- Should show: `referralCount: 1`

---

## ✅ STEP 4: Check Server Logs

Restart server and watch for these logs:

### **When Friend Clicks Referral Link:**
```
Browser Console:
🔍 Found referral code in URL: CF4BD0DC
💾 Stored referral code for later application
```

### **When Friend Connects Discord:**
```
Browser Console:
🔍 Found pending referral code, applying now...

Server Console:
🔍 Apply referral request: { discordUserId: '123...', referralCode: 'CF4BD0DC' }
📊 Referrer query: { referrer: { id: '...', referral_code: 'CF4BD0DC', discord_username: 'user_a' } }
✅ Found referrer: user_a (CF4BD0DC)
📊 User being referred query: { user: { id: '...', discord_username: 'user_b', referred_by: null } }
📋 User being referred: user_b, already has referrer: none
✅ Referral applied: 123... referred by CF4BD0DC
```

### **When Friend Submits Wallet:**
```
Browser Console:
✅ Wallet address saved successfully! 🎉
✅ Referral completed - referrer count updated

Server Console:
🔍 Complete referral request for Discord ID: 123...
📊 User query result: { user: { discord_username: 'user_b', wallet_address: '0x...', referred_by: 'CF4BD0DC' } }
📋 User data: { username: 'user_b', has_wallet: true, referred_by: 'CF4BD0DC' }
🎯 User 123... completed all tasks, updating referrer: CF4BD0DC
✅ Referral completed! Referrer CF4BD0DC now has 1 completed referrals
```

---

## ✅ STEP 5: Manual Database Check

After friend completes all tasks:

```sql
-- Check if friend has referrer set
SELECT 
    discord_username,
    referred_by,
    wallet_address
FROM users
WHERE discord_provider_id = 'FRIEND_DISCORD_ID';
```

**Expected:**
```
referred_by: CF4BD0DC
wallet_address: 0x123...
```

```sql
-- Check referrer's count
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE referral_code = 'CF4BD0DC';
```

**Expected:**
```
referral_count: 1
referral_completed_count: 1
```

---

## 🐛 COMMON ISSUES & FIXES

### **Issue 1: `referred_by` is NULL**

**Problem:** Friend's `referred_by` field is empty

**Cause:** Referral code wasn't applied when friend connected Discord

**Fix:**
```sql
-- Manually set referrer
UPDATE users
SET referred_by = 'CF4BD0DC'  -- User A's code
WHERE discord_provider_id = 'FRIEND_DISCORD_ID';
```

Then restart server and have friend refresh page.

---

### **Issue 2: `referral_completed_count` is 0**

**Problem:** Count didn't increase even though friend completed tasks

**Cause:** `/api/complete-referral` wasn't called or failed

**Check Server Logs:** Look for "Complete referral request"

**Manual Fix:**
```sql
-- Manually increment count
UPDATE users
SET referral_completed_count = referral_completed_count + 1
WHERE referral_code = 'CF4BD0DC';
```

---

### **Issue 3: No Server Logs**

**Problem:** No logs appearing when testing

**Fix:**
1. Stop server (Ctrl+C)
2. Start server: `node server.js`
3. Clear browser cache: `localStorage.clear()`
4. Refresh page
5. Try again

---

### **Issue 4: "User not found" Error**

**Problem:** API returns 404

**Check:**
```sql
-- Verify user exists
SELECT discord_provider_id, discord_username
FROM users
WHERE discord_provider_id = 'YOUR_DISCORD_ID';
```

**If no results:** User wasn't created. Connect Discord again.

---

### **Issue 5: Referral Code Not Generated**

**Problem:** User A has no `referral_code`

**Fix:**
```sql
-- Generate referral code manually
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE discord_provider_id = 'USER_A_DISCORD_ID'
AND referral_code IS NULL;
```

---

## 🧪 COMPLETE TEST SCENARIO

### **Setup:**
- User A: Discord ID = `1306888014408187967`
- User B: Discord ID = `9999999999999999999` (different account!)

### **Step 1: User A Gets Referral Link**
1. User A completes all tasks
2. Check database:
```sql
SELECT referral_code FROM users WHERE discord_provider_id = '1306888014408187967';
```
3. Should return: `CF4BD0DC` (or similar)

### **Step 2: User B Uses Referral Link**
1. Open incognito: `http://localhost:3000?ref=CF4BD0DC`
2. User B connects Discord (different account!)
3. Check server logs for: `✅ Referral applied`
4. Check database:
```sql
SELECT referred_by FROM users WHERE discord_provider_id = '9999999999999999999';
```
5. Should return: `CF4BD0DC`

### **Step 3: User B Completes Tasks**
1. User B joins Discord server
2. User B connects X
3. User B submits wallet
4. Check server logs for: `✅ Referral completed! Referrer CF4BD0DC now has 1 completed referrals`
5. Check database:
```sql
SELECT referral_completed_count FROM users WHERE referral_code = 'CF4BD0DC';
```
6. Should return: `1`

### **Step 4: User A Checks Count**
1. User A refreshes page
2. Should see: "Referrals: 1"

---

## 📊 SQL Debug Queries

Run all queries from: `TEST_REFERRAL_DEBUG.sql`

Key queries:
1. Check all users
2. Check who referred whom
3. Verify referral integrity
4. Manual fixes

---

## 🔧 If Nothing Works

### **Nuclear Option - Reset Everything:**

```sql
-- Clear all referral data
UPDATE users SET 
    referral_code = NULL,
    referred_by = NULL,
    referral_count = 0,
    referral_completed_count = 0;

-- Delete all users
DELETE FROM users;
```

Then:
1. Clear browser: `localStorage.clear()`
2. Restart server
3. Start fresh with User A and User B

---

## ✅ SUCCESS CHECKLIST

- [ ] Database has referral columns
- [ ] User A has `referral_code`
- [ ] User B has `referred_by` = User A's code
- [ ] Server logs show "Referral applied"
- [ ] Server logs show "Referral completed"
- [ ] Database shows `referral_completed_count` = 1
- [ ] UI shows "Referrals: 1"

---

**If you complete all steps and it still doesn't work, share:**
1. Server console logs
2. Browser console logs
3. SQL query results from Step 2

I'll help you debug further! 🚀
