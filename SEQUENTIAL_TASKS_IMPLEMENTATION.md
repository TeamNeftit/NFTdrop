# Sequential Tasks Implementation Plan

## Architecture Overview

### Core Principle: Discord is the PRIMARY identifier
- Discord connection creates the user session (UUID)
- X and Wallet are added to the SAME UUID
- All data lives in ONE row in the database

### Flow:

```
1. User connects Discord
   → Creates new user row with UUID
   → Stores Discord ID in localStorage
   → Unlocks X task

2. User connects X
   → Checks: Is Discord connected? (from localStorage)
   → Checks: Is this X account already used?
   → If valid: Adds X to SAME UUID
   → Unlocks Wallet task

3. User submits Wallet
   → Checks: Is Discord + X connected?
   → Checks: Is this wallet already used?
   → If valid: Adds wallet to SAME UUID
   → Marks user as eligible
```

### Session Restoration:

```
User returns later:
1. Check localStorage for Discord ID
2. Query database for that Discord ID
3. Restore all completed tasks (Discord, X, Wallet)
4. Show correct UI state (locked/unlocked tasks)
```

### Validation Rules:

1. **Discord:** Can reconnect anytime (restores session)
2. **X:** Must have Discord first, cannot reuse X from another account
3. **Wallet:** Must have Discord + X first, cannot reuse wallet from another account

## Implementation Steps:

1. ✅ Add API endpoint to link X to existing Discord session
2. ✅ Add API endpoint to link Wallet to existing session
3. ✅ Update frontend to pass Discord ID when connecting X
4. ✅ Update frontend to lock/unlock tasks based on completion
5. ✅ Add session restoration on page load
