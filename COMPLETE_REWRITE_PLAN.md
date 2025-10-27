# 🔧 COMPLETE LOGIC REWRITE - SEQUENTIAL TASKS

## 📊 Database Structure (Supabase `users` table)

```sql
- id (UUID, primary key)
- discord_provider_id (text) - Discord user ID
- discord_username (text)
- discord_email (text)
- discord_connected_at (timestamp)
- discord_joined (boolean) - Has user joined Discord server?
- discord_joined_at (timestamp)
- twitter_provider_id (text) - X/Twitter user ID
- twitter_username (text)
- twitter_email (text)
- twitter_connected_at (timestamp)
- followed_neftit (boolean) - Has user followed on X?
- wallet_address (text)
- wallet_connected_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

## 🔄 Complete Flow

### **Step 1: Discord Connection**

**User Action:** Click "CONNECT DISCORD"

**Backend Logic:**
1. Check if `discord_provider_id` exists in database
2. **If EXISTS:**
   - Check if `wallet_address` is filled
   - If wallet filled → Error: "Account locked"
   - If no wallet → Update Discord data, send `restored: true`
3. **If NOT EXISTS:**
   - Create new UUID
   - Save Discord data
   - Send `restored: false`

**Frontend Logic:**
1. Receive message with `restored` flag
2. **If `restored === true`:**
   - Call `/api/session/{discordId}`
   - Load all completed tasks
   - Update UI to show completed tasks
   - Unlock appropriate next task
3. **If `restored === false`:**
   - Hide "CONNECT DISCORD" button
   - Show "JOIN DISCORD SERVER" button
   - Keep X and Wallet locked

### **Step 2: Discord Join & Verify**

**User Action:** Click "JOIN DISCORD SERVER" → Click "VERIFY JOIN"

**Backend Logic:**
1. Check if user is in Discord server (bot API)
2. If yes → Update `discord_joined = true`
3. Return success

**Frontend Logic:**
1. Hide "JOIN" and "VERIFY" buttons
2. Show "✓ COMPLETED" button (green, disabled)
3. Set `completedTasks.discord = true`
4. **UNLOCK X TASK** (remove locked class, enable button)
5. Save to localStorage

### **Step 3: X Connection**

**User Action:** Click "CONNECT X"

**Frontend Check:**
1. Check `completedTasks.discord === true`
2. If false → Error: "Complete Discord first"

**Backend Logic:**
1. Get Discord ID from request
2. Find user by `discord_provider_id`
3. Check if `twitter_provider_id` already exists for ANOTHER user
4. If exists for another user → Error: "X account already linked"
5. Update user with X data
6. Send success

**Frontend Logic:**
1. Hide "CONNECT X" button
2. Show "FOLLOW X" button
3. Keep verify button hidden

### **Step 4: X Follow & Verify**

**User Action:** Click "FOLLOW X" → Click "VERIFY FOLLOW"

**Backend Logic:**
1. Check if user follows @neftit
2. If yes → Update `followed_neftit = true`
3. Return success

**Frontend Logic:**
1. Hide all X buttons
2. Show "✓ COMPLETED" button
3. Set `completedTasks.follow = true`
4. **UNLOCK WALLET TASK** (enable input and button)
5. Save to localStorage

### **Step 5: Wallet Submit**

**User Action:** Enter wallet address → Click "SUBMIT"

**Frontend Check:**
1. Check `completedTasks.discord === true`
2. Check `completedTasks.follow === true`
3. If either false → Error

**Backend Logic:**
1. Get Discord ID from request
2. Find user by `discord_provider_id`
3. Check if `wallet_address` already filled
4. If filled → Error: "Wallet already submitted"
5. Update `wallet_address`
6. Return success

**Frontend Logic:**
1. Disable input and button
2. Show "✓ COMPLETED"
3. Set `completedTasks.address = true`
4. Show success message
5. Save to localStorage

## 🔑 Key Fixes Needed

### 1. **postMessage Delivery**
- Add `setTimeout(() => window.close(), 1000)` (increased to 1 second)
- Ensure message is sent BEFORE closing

### 2. **Frontend Message Listener**
- Add detailed logging
- Check `event.origin` matches BASE_URL
- Handle both `restored: true` and `restored: false`

### 3. **Session Restoration**
- `/api/session/{discordId}` must return complete state
- Frontend must update ALL UI elements based on state

### 4. **Task Locking**
- X and Wallet start disabled in HTML
- Only unlock when previous task completed
- Check completion before allowing next task

### 5. **localStorage Sync**
- Save `completedTasks` after every change
- Load on page load
- Use as source of truth for UI state

## 🚀 Implementation Order

1. Fix postMessage timing (increase delay to 1000ms)
2. Add comprehensive logging to frontend
3. Fix session restoration API
4. Fix frontend to properly handle restored sessions
5. Add task locking enforcement
6. Test each step individually
