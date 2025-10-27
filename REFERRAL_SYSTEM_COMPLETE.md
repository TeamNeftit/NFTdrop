# ✅ REFERRAL SYSTEM - COMPLETE IMPLEMENTATION

## 🎯 What This Does

Users can now **refer friends** and earn rewards! The referral system:

1. **Unlocks after completing all tasks** (Discord + X + Wallet)
2. **Generates unique referral link** for each user
3. **Tracks referral count** - only counts when referred friend completes all tasks
4. **Shows referral stats** - displays how many friends completed tasks

---

## 🔄 Complete Flow

### **Step 1: User Completes All Tasks**

```
User completes:
1. Discord (Connect → Join → Verify)
2. X (Connect → Follow)
3. Wallet (Submit address)

→ Referral link unlocks automatically
→ User sees referral link and copy button
→ User sees referral count: 0
```

### **Step 2: User Shares Referral Link**

```
User clicks "COPY" button
→ Link copied: http://localhost:3000?ref=ABC12345
→ User shares with friends
```

### **Step 3: Friend Uses Referral Link**

```
Friend clicks link: http://localhost:3000?ref=ABC12345
→ Page loads with referral code in URL
→ Friend connects Discord
→ Referral code applied to friend's account
→ Notification: "Referral code applied! Complete all tasks to count."
```

### **Step 4: Friend Completes All Tasks**

```
Friend completes all 3 tasks
→ Friend submits wallet address
→ Backend increments referrer's count
→ Referrer's count updates: 0 → 1
```

---

## 📊 Database Schema

### **New Columns Added to `users` Table:**

```sql
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_completed_count INTEGER DEFAULT 0;
```

**Column Descriptions:**

- `referral_code`: Unique code for this user (e.g., "ABC12345")
- `referred_by`: Referral code of who referred this user
- `referral_count`: Total users who used this code (not used currently)
- `referral_completed_count`: Users who completed all tasks

---

## 🚀 Setup Instructions

### **Step 1: Run SQL Migration**

Execute the SQL file to add referral columns:

```bash
# Connect to Supabase and run:
psql -h snkeusvyeztkpktxnxnr.supabase.co -U postgres -d postgres -f add-referral-system.sql
```

Or run in Supabase SQL Editor:

1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Copy contents of `add-referral-system.sql`
4. Click "Run"

### **Step 2: Restart Server**

```bash
# Stop server: Ctrl+C
# Start server:
node server.js
```

### **Step 3: Test Referral System**

1. **Complete all tasks** (Discord, X, Wallet)
2. **Check referral section** - should show link and copy button
3. **Copy referral link**
4. **Open in incognito** with referral link
5. **Complete all tasks** as new user
6. **Check original user** - referral count should increase

---

## 📝 Files Modified

### **1. Backend (server.js)**

Added 3 new API endpoints:

#### **GET `/api/referral/:discordUserId`**
- Gets user's referral info
- Returns referral code, count, and link
- Only returns link if user completed all tasks

```javascript
// Example response:
{
  "success": true,
  "referralCode": "B1CC3475",
  "referralCount": 5,
  "hasCompletedAllTasks": true,
  "referralLink": "http://localhost:3000?ref=B1CC3475"
}
```

#### **POST `/api/apply-referral`**
- Applies referral code to new user
- Validates code exists
- Prevents self-referral
- Increments referrer's total count

```javascript
// Request body:
{
  "discordUserId": "1306888014408187967",
  "referralCode": "B1CC3475"
}
```

#### **POST `/api/complete-referral`**
- Called when user completes all tasks
- Increments referrer's completed count
- Only counts if user was referred

```javascript
// Request body:
{
  "discordUserId": "1306888014408187967"
}
```

### **2. Frontend (script.js)**

Added 4 new functions:

#### **`loadReferralInfo()`**
- Loads user's referral data from backend
- Shows/hides referral link based on completion
- Updates referral count display

#### **`copyReferralLink()`**
- Copies referral link to clipboard
- Shows success notification
- Visual feedback on button

#### **`checkAndApplyReferral()`**
- Checks URL for referral code (`?ref=ABC`)
- Applies code when user connects Discord
- Stores pending code if Discord not connected yet

#### **`completeReferral()`**
- Called when user submits wallet
- Notifies backend to increment referrer's count

### **3. UI (Home.jsx)**

Added referral section with:

```jsx
<div className="refer" id="referral-section">
  <h2>REFER A FRIEND</h2>
  <p>Share the link with your friends and get rewards</p>
  
  {/* Shown after completing all tasks */}
  <div id="referral-content">
    <input id="referral-link-input" readOnly />
    <button id="copy-referral-btn">COPY</button>
    <p>Referrals: <span id="referral-count-value">0</span></p>
  </div>
  
  {/* Shown before completing all tasks */}
  <div id="referral-locked">
    <p>🔒 Complete all tasks to unlock your referral link</p>
  </div>
</div>
```

### **4. Styles (Home.css)**

Added CSS for:
- `.referral-link-container` - Input + button layout
- `.referral-input` - Styled input field
- `.copy-referral-btn` - Gradient button with hover effects
- `.referral-stats` - Referral count display
- `.referral-locked-text` - Locked state message

---

## 🎨 UI States

### **State 1: Locked (Before Completing Tasks)**

```
┌─────────────────────────────────────┐
│ REFER A FRIEND                      │
│ Share the link with your friends... │
│                                     │
│ 🔒 Complete all tasks to unlock    │
│    your referral link               │
└─────────────────────────────────────┘
```

### **State 2: Unlocked (After Completing Tasks)**

```
┌─────────────────────────────────────┐
│ REFER A FRIEND                      │
│ Share the link with your friends... │
│                                     │
│ ┌─────────────────────────┬──────┐ │
│ │ http://localhost:3000?  │ COPY │ │
│ │ ref=B1CC3475            │      │ │
│ └─────────────────────────┴──────┘ │
│                                     │
│ Referrals: 3                        │
└─────────────────────────────────────┘
```

### **State 3: Copied (After Clicking Copy)**

```
┌─────────────────────────────────────┐
│ REFER A FRIEND                      │
│ Share the link with your friends... │
│                                     │
│ ┌─────────────────────────┬──────┐ │
│ │ http://localhost:3000?  │ ✓    │ │
│ │ ref=B1CC3475            │COPIED│ │
│ └─────────────────────────┴──────┘ │
│                                     │
│ Referrals: 3                        │
└─────────────────────────────────────┘
```

---

## 🔍 Testing Scenarios

### **Scenario 1: Complete Tasks and Get Referral Link**

1. Complete Discord task
2. Complete X task
3. Submit wallet address
4. Check referral section → Should show link
5. Click "COPY" → Should copy to clipboard
6. Check console → Should see referral code

**Expected Logs:**
```
✅ Wallet address saved successfully! 🎉
✅ Referral completed - referrer count updated
🔍 Loading referral info for user: 1306888014408187967
📊 Referral data: {success: true, hasCompletedAllTasks: true, ...}
✅ Referral link unlocked: http://localhost:3000?ref=B1CC3475
📊 Referral count: 0
```

### **Scenario 2: Friend Uses Referral Link**

1. Copy referral link: `http://localhost:3000?ref=B1CC3475`
2. Open in incognito/new browser
3. Connect Discord
4. Complete all tasks
5. Check original user's referral count → Should increase

**Expected Logs (Friend's Browser):**
```
🔍 Found referral code in URL: B1CC3475
💾 Stored referral code for later application
🎉 Discord OAuth SUCCESS received
🔍 Found pending referral code, applying now...
✅ Referral code applied successfully
```

**Expected Logs (After Friend Completes):**
```
✅ Wallet address saved successfully! 🎉
✅ Referral completed - referrer count updated
```

### **Scenario 3: Self-Referral Prevention**

1. Copy your own referral link
2. Try to use it on same account
3. Should show error

**Expected:**
```
⚠️ Referral code application failed: Cannot refer yourself
```

### **Scenario 4: Invalid Referral Code**

1. Visit: `http://localhost:3000?ref=INVALID123`
2. Connect Discord
3. Should show error

**Expected:**
```
⚠️ Referral code application failed: Invalid referral code
```

---

## 📊 Database Queries

### **Check User's Referral Info:**

```sql
SELECT 
    discord_username,
    referral_code,
    referral_completed_count,
    referred_by
FROM users
WHERE discord_provider_id = '1306888014408187967';
```

### **See All Referrals for a User:**

```sql
SELECT 
    u2.discord_username as referred_user,
    u2.wallet_address as completed,
    u2.created_at
FROM users u1
JOIN users u2 ON u2.referred_by = u1.referral_code
WHERE u1.discord_provider_id = '1306888014408187967';
```

### **Top Referrers:**

```sql
SELECT 
    discord_username,
    referral_code,
    referral_completed_count
FROM users
WHERE referral_completed_count > 0
ORDER BY referral_completed_count DESC
LIMIT 10;
```

---

## ✅ Features Implemented

- ✅ Unique referral code generation
- ✅ Referral link unlocks after completing all tasks
- ✅ Copy to clipboard functionality
- ✅ Referral count tracking
- ✅ Only counts completed referrals (wallet submitted)
- ✅ Prevents self-referral
- ✅ Validates referral codes
- ✅ Handles pending referrals (code in URL before Discord connect)
- ✅ Beautiful UI with locked/unlocked states
- ✅ Visual feedback on copy
- ✅ Responsive design

---

## 🎯 Benefits

1. **Viral Growth:** Users incentivized to share
2. **Quality Referrals:** Only counts completed tasks
3. **Fair System:** Prevents gaming/self-referral
4. **Easy to Use:** One-click copy
5. **Transparent:** Users see their referral count
6. **Persistent:** Works across sessions

---

## 🚀 Next Steps (Optional Enhancements)

1. **Referral Rewards:**
   - Add NFT tier bonuses for referrers
   - Special roles for top referrers

2. **Leaderboard:**
   - Show top referrers
   - Display on separate page

3. **Referral History:**
   - Show list of referred users
   - Display completion status

4. **Social Sharing:**
   - Add Twitter/Discord share buttons
   - Pre-filled share text

5. **Analytics:**
   - Track referral conversion rate
   - Show referral funnel

---

**Run the SQL migration, restart your server, and test it!** 🎉
