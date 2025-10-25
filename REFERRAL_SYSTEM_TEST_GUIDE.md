# 🧪 REFERRAL SYSTEM - COMPLETE TEST GUIDE

## 🎯 How It Works

```
User A (Referrer)
    ↓
Completes all 3 tasks
    ↓
Gets referral link: http://localhost:3000?ref=2D0895A4
    ↓
Shares with User B (Friend)
    ↓
User B clicks link and completes all tasks
    ↓
User A's referral count increases!
```

---

## 🚀 STEP-BY-STEP TEST

### **PART 1: User A (Referrer) - Get Referral Link**

#### **1. Open Browser (Normal Mode)**
- Go to: `http://localhost:3000`
- Open DevTools Console (F12)

#### **2. Complete All Tasks as User A:**

**a) Discord:**
- Click "CONNECT DISCORD"
- Authorize
- Click "JOIN DISCORD SERVER"
- Join the server
- Click "VERIFY JOIN"
- ✅ Should show "✓ Completed"

**b) X (Twitter):**
- Click "CONNECT X"
- Authorize
- ✅ Should show "✓ Completed"

**c) Wallet:**
- Enter EVM address: `0x1111111111111111111111111111111111111111`
- Click "SUBMIT"
- ✅ Should show "✓ Submitted"

#### **3. Check Referral Link Appears:**

**UI Should Show:**
```
REFER A FRIEND
Share the link with your friends and get rewards

┌────────────────────────────────┬──────┐
│ http://localhost:3000?ref=2D0  │ COPY │
│ 895A4                          │      │
└────────────────────────────────┴──────┘

Referrals: 0
```

**Console Should Show:**
```
✅ Referral link unlocked: http://localhost:3000?ref=2D0895A4
📊 Referral count: 0
```

**Server Console Should Show:**
```
🎯 Generated referral code: 2D0895A4 for user: 2d0895a4-5379-447c-9269-97e99931615e
✅ Wallet linked to Discord session: 2d0895a4-5379-447c-9269-97e99931615e
✅ Referral code set: 2D0895A4
```

#### **4. Copy Referral Link:**
- Click "COPY" button
- Link copied: `http://localhost:3000?ref=2D0895A4`

---

### **PART 2: User B (Friend) - Use Referral Link**

#### **1. Open Incognito/Private Window:**
- Press `Ctrl+Shift+N` (Chrome) or `Ctrl+Shift+P` (Firefox)
- Open DevTools Console (F12)

#### **2. Visit Referral Link:**
- Paste: `http://localhost:3000?ref=2D0895A4`
- Press Enter

**Console Should Show:**
```
🔍 Found referral code in URL: 2D0895A4
💾 Stored referral code for later application
```

#### **3. Complete Discord Task:**
- Click "CONNECT DISCORD"
- **Use DIFFERENT Discord account** (not User A's account!)
- Authorize

**Console Should Show:**
```
🔍 Found pending referral code, applying now...
✅ Referral code applied successfully
```

**Server Console Should Show:**
```
✅ Referral applied: 1234567890123456789 referred by 2D0895A4
```

#### **4. Complete Remaining Tasks:**

**a) Join Discord Server:**
- Click "JOIN DISCORD SERVER"
- Join
- Click "VERIFY JOIN"

**b) Connect X:**
- Click "CONNECT X"
- **Use DIFFERENT X account** (not User A's account!)
- Authorize

**c) Submit Wallet:**
- Enter DIFFERENT address: `0x2222222222222222222222222222222222222222`
- Click "SUBMIT"

**Console Should Show:**
```
✅ Wallet address saved successfully! 🎉
✅ Referral completed - referrer count updated
```

**Server Console Should Show:**
```
🎯 User 1234567890123456789 completed all tasks, updating referrer: 2D0895A4
✅ Referral completed! Referrer 2D0895A4 now has 1 completed referrals
```

---

### **PART 3: User A - Check Referral Count**

#### **1. Go Back to User A's Browser (Normal Mode)**

#### **2. Refresh Page:**
- Press `Ctrl+R`

#### **3. Check Referral Section:**

**UI Should Show:**
```
REFER A FRIEND

┌────────────────────────────────┬──────┐
│ http://localhost:3000?ref=2D0  │ COPY │
│ 895A4                          │      │
└────────────────────────────────┴──────┘

Referrals: 1  ← UPDATED!
```

**Console Should Show:**
```
📊 Referral count: 1
```

---

## 📊 Verify in Database

Run in Supabase SQL Editor:

### **Check User A (Referrer):**
```sql
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE referral_code = '2D0895A4';
```

**Expected:**
```
referral_code: 2D0895A4
referral_count: 1
referral_completed_count: 1  ← Should be 1!
```

### **Check User B (Referred Friend):**
```sql
SELECT 
    discord_username,
    referred_by,
    wallet_address
FROM users
WHERE referred_by = '2D0895A4';
```

**Expected:**
```
referred_by: 2D0895A4  ← Has referrer!
wallet_address: 0x2222...
```

---

## 🔍 Key Logs to Watch

### **When Friend Clicks Referral Link:**
```
Browser Console:
🔍 Found referral code in URL: 2D0895A4
💾 Stored referral code for later application
```

### **When Friend Connects Discord:**
```
Browser Console:
🔍 Found pending referral code, applying now...
✅ Referral code applied successfully

Server Console:
✅ Referral applied: 1234567890123456789 referred by 2D0895A4
```

### **When Friend Submits Wallet:**
```
Browser Console:
✅ Referral completed - referrer count updated

Server Console:
🎯 User 1234567890123456789 completed all tasks, updating referrer: 2D0895A4
✅ Referral completed! Referrer 2D0895A4 now has 1 completed referrals
```

### **When Referrer Refreshes:**
```
Browser Console:
📊 Referral count: 1

Server Console:
🔍 Referral check for user: 1306888014408187967
📊 Task status: { hasCompletedAllTasks: true }
```

---

## ✅ Success Checklist

- [ ] User A completes all tasks
- [ ] User A sees referral link
- [ ] User A can copy referral link
- [ ] User B visits referral link in incognito
- [ ] User B sees "Referral code applied" after Discord connect
- [ ] User B completes all tasks
- [ ] Server logs show "Referral completed"
- [ ] User A refreshes and sees count: 1
- [ ] Database shows `referred_by` = User A's code
- [ ] Database shows `referral_completed_count` = 1

---

## 🐛 Troubleshooting

### **"Referral code applied" doesn't show**
- Check browser console for errors
- Check server console for "Referral applied" log
- Verify referral code in URL is correct

### **Count doesn't increase**
- Check server console for "Referral completed" log
- Verify friend completed ALL 3 tasks
- Check database: `referred_by` should have referrer's code

### **"Cannot refer yourself" error**
- You're using same Discord account
- Use different Discord account in incognito

---

## 🎯 Quick Test Commands

### **Reset User A (for retesting):**
```sql
-- Clear User A's data
DELETE FROM users WHERE discord_provider_id = '1306888014408187967';
```

Then clear browser:
```javascript
localStorage.clear()
```

### **Check All Referrals:**
```sql
SELECT 
    u1.discord_username as referrer,
    u1.referral_code,
    u1.referral_completed_count,
    u2.discord_username as referred_user,
    u2.wallet_address
FROM users u1
LEFT JOIN users u2 ON u2.referred_by = u1.referral_code
WHERE u1.referral_code IS NOT NULL
ORDER BY u1.referral_completed_count DESC;
```

---

**Follow this guide step by step and the referral system will work perfectly!** 🎉
