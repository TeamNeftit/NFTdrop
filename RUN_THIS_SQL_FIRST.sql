-- ========================================
-- IMPORTANT: RUN THIS FIRST!
-- Add twitter_followed column to track verification
-- ========================================

-- Add the column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_followed BOOLEAN DEFAULT FALSE;

-- Add timestamp column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_followed_at TIMESTAMPTZ;

-- Verify it was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('twitter_followed', 'twitter_followed_at');

-- Check your current data
SELECT 
    discord_username,
    twitter_username,
    twitter_provider_id,
    twitter_followed,
    wallet_address
FROM users
WHERE discord_provider_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
