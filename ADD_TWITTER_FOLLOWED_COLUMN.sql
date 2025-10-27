-- ========================================
-- ADD TWITTER FOLLOW TRACKING COLUMNS
-- ========================================

-- Add twitter_followed column (boolean)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_followed BOOLEAN DEFAULT FALSE;

-- Add twitter_followed_at column (timestamp)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_followed_at TIMESTAMPTZ;

-- ========================================
-- UPDATE EXISTING USERS
-- ========================================

-- For users who already have twitter_connected = true,
-- we'll assume they haven't followed yet (they need to re-verify)
-- So we don't need to update existing records

-- ========================================
-- VERIFY THE CHANGES
-- ========================================

-- Check the new columns
SELECT 
    discord_username,
    twitter_username,
    twitter_connected_at,
    twitter_followed,
    twitter_followed_at
FROM users
WHERE twitter_provider_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- NOTES
-- ========================================

-- twitter_followed = FALSE (default) - User connected X but hasn't followed yet
-- twitter_followed = TRUE - User has clicked "Follow" and verified
-- twitter_followed_at - Timestamp when user verified the follow

-- This allows the flow:
-- 1. Connect X (twitter_provider_id set)
-- 2. Click Follow button (opens Twitter)
-- 3. Click Verify (sets twitter_followed = true)
