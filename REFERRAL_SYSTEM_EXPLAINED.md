# 🎯 REFERRAL SYSTEM - HOW IT WORKS

## ✅ GOOD NEWS: SYSTEM ALREADY USES REFERRAL CODES!

Your system is **already correctly** using referral CODES (like `3041A2DD`), NOT UUIDs!

---

## 📊 DATABASE STRUCTURE

### **Column: `referral_code`**
- **Type:** TEXT
- **Stores:** User's own referral code (e.g., `3041A2DD`)
- **Generated from:** First 8 characters of user's UUID
- **Example:** `3041A2DD`, `BC02346B`, `2D0895A4`

### **Column: `referred_by`**
- **Type:** TEXT (NOT UUID!)
- **Stores:** The referral CODE of who referred this user
- **Example:** If you referred someone, their `referred_by` = `3041A2DD`

---

## 🔄 HOW IT WORKS

### **Example with Your Accounts:**

#### **Account 1 (You - Referrer):**
```
discord_provider_id: 1306888014408187967
referral_code: 3041A2DD  ← Your unique code
referred_by: NULL  ← You weren't referred by anyone
referral_completed_count: 1  ← Number of people who completed tasks
```

#### **Account 2 (Friend - Referred):**
```
discord_provider_id: 922331804206268467
referral_code: BC02346B  ← Friend's own code
referred_by: 3041A2DD  ← YOUR CODE (not UUID!)
wallet_address: 0x123...  ← Completed tasks
```

---

## 🔍 CODE VERIFICATION

### **Backend stores referral CODE (Line 2273):**
```javascript
.update({ 
    referred_by: referralCode.toUpperCase()  // ← Stores CODE like "3041A2DD"
})
```

### **Backend finds referrer by CODE (Line 1278):**
```javascript
.eq('referral_code', user.referred_by)  // ← Matches by CODE, not UUID!
```

### **Backend increments count by CODE (Line 2371):**
```javascript
.eq('referral_code', user.referred_by)  // ← Uses CODE to find referrer
```

---

## ✅ VERIFICATION STEPS

### **Step 1: Check Column Types**

Run in Supabase:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by');
```

**Expected:**
```
referral_code: text
referred_by: text  ← Should be TEXT, not uuid!
```

### **Step 2: Check Your Data**

```sql
SELECT 
    discord_username,
    referral_code,
    referred_by
FROM users
WHERE discord_provider_id IN ('1306888014408187967', '922331804206268467');
```

**Expected:**
```
Your account:
  referral_code: 3041A2DD
  referred_by: NULL

Friend's account:
  referral_code: BC02346B
  referred_by: 3041A2DD  ← Should be YOUR CODE!
```

### **Step 3: Fix If Needed**

If friend's `referred_by` is NULL:
```sql
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467';
```

If your count is 0:
```sql
UPDATE users
SET referral_completed_count = 1
WHERE referral_code = '3041A2DD';
```

---

## 🎯 COMPLETE FLOW

### **1. You complete tasks:**
- System generates your code: `3041A2DD`
- You get link: `http://localhost:3000?ref=3041A2DD`

### **2. Friend clicks your link:**
- URL has: `?ref=3041A2DD`
- Code stored in browser

### **3. Friend connects Discord:**
- System calls: `/api/apply-referral`
- Sets: `referred_by = "3041A2DD"` ← YOUR CODE!
- NOT a UUID!

### **4. Friend completes tasks:**
- System finds you by: `WHERE referral_code = "3041A2DD"`
- Increments your `referral_completed_count`

### **5. You refresh:**
- See: **Referrals: 1** ✅

---

## 📝 KEY POINTS

1. ✅ **`referred_by` stores CODES, not UUIDs**
2. ✅ **Codes are 8 characters** (e.g., `3041A2DD`)
3. ✅ **System matches by CODE** using `.eq('referral_code', user.referred_by)`
4. ✅ **No changes needed** - system is already correct!

---

## 🔧 IF YOU SEE UUIDs IN `referred_by`

If somehow `referred_by` contains UUIDs like `3041a2dd-1234-5678-...`, run this:

```sql
-- Convert UUIDs to CODEs
UPDATE users u1
SET referred_by = (
    SELECT u2.referral_code 
    FROM users u2 
    WHERE u2.id = u1.referred_by::uuid
)
WHERE referred_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
```

But this shouldn't be necessary - your system is already correct!

---

## ✅ VERIFICATION SCRIPT

Run: `VERIFY_REFERRED_BY_COLUMN.sql`

This will:
1. Check column types
2. Check your data format
3. Fix if needed
4. Verify relationships
5. Update counts

---

**Your system is already using referral CODES correctly! Just run the verification script to check your data.** 🎉
