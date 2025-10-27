# 🚀 Referral System - SQL Setup (Step by Step)

## ⚡ Quick Setup - Copy and Run Each Step

### **Step 1: Add Columns**

Copy and run this in Supabase SQL Editor:

```sql
-- Add referral columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_completed_count INTEGER DEFAULT 0;
```

**Expected:** ✅ Success (or "column already exists")

---

### **Step 2: Create Indexes**

```sql
-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
```

**Expected:** ✅ Success

---

### **Step 3: Add Unique Constraint**

```sql
-- Make referral_code unique
ALTER TABLE users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);
```

**Expected:** ✅ Success

**If error "constraint already exists":** That's fine, skip to next step.

---

### **Step 4: Generate Referral Codes for Existing Users**

```sql
-- Generate referral codes for users who completed all tasks
UPDATE users 
SET referral_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE referral_code IS NULL 
  AND wallet_address IS NOT NULL;
```

**Expected:** Shows number of rows updated (e.g., "UPDATE 5")

---

### **Step 5: Verify Setup**

```sql
-- Check if columns exist
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

---

### **Step 6: Test with Your User**

```sql
-- Check your referral info
SELECT 
    discord_username,
    discord_joined,
    twitter_connected,
    wallet_address,
    referral_code,
    referral_completed_count
FROM users
WHERE discord_provider_id = 'YOUR_DISCORD_ID_HERE';
```

Replace `YOUR_DISCORD_ID_HERE` with your actual Discord ID from localStorage.

**Expected:**
- `discord_joined`: true
- `twitter_connected`: true
- `wallet_address`: 0x123...
- `referral_code`: ABC12345 (8 characters)
- `referral_completed_count`: 0

---

## ✅ All Done!

If all steps succeeded, your referral system is ready!

Now:
1. **Restart your server:** `node server.js`
2. **Refresh browser:** `Ctrl+R`
3. **Check referral section:** Should show your link!

---

## 🐛 Troubleshooting

### **Error: "column already exists"**
✅ **Good!** Skip that step, column is already there.

### **Error: "constraint already exists"**
✅ **Good!** Skip that step, constraint is already there.

### **Error: "relation does not exist"**
❌ **Problem:** You're in the wrong database.
- Make sure you're in your Supabase project
- Check you selected the correct database

### **No referral_code generated**
Run this to manually generate one:

```sql
UPDATE users 
SET referral_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE discord_provider_id = 'YOUR_DISCORD_ID_HERE';
```

---

## 📊 Useful Queries

### **See all users with referral codes:**
```sql
SELECT discord_username, referral_code, referral_completed_count
FROM users
WHERE referral_code IS NOT NULL
ORDER BY referral_completed_count DESC;
```

### **See who referred whom:**
```sql
SELECT 
    u1.discord_username as referrer,
    u1.referral_code,
    u2.discord_username as referred_user,
    u2.wallet_address IS NOT NULL as completed
FROM users u1
JOIN users u2 ON u2.referred_by = u1.referral_code
ORDER BY u1.discord_username;
```

### **Count total referrals:**
```sql
SELECT 
    u.discord_username,
    u.referral_code,
    COUNT(r.id) as total_referrals,
    COUNT(CASE WHEN r.wallet_address IS NOT NULL THEN 1 END) as completed_referrals
FROM users u
LEFT JOIN users r ON r.referred_by = u.referral_code
GROUP BY u.id, u.discord_username, u.referral_code
HAVING COUNT(r.id) > 0
ORDER BY completed_referrals DESC;
```

---

**Run each step in order and you're done!** 🎉
