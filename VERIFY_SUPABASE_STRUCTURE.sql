-- ========================================
-- COMPLETE SUPABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. CHECK IF 'users' TABLE EXISTS
-- ========================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
) as users_table_exists;

-- ========================================
-- 2. CHECK ALL COLUMNS IN 'users' TABLE
-- ========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- 3. VERIFY REQUIRED COLUMNS EXIST
-- ========================================
SELECT 
    'id' as column_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') as exists
UNION ALL
SELECT 'discord_provider_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'discord_provider_id')
UNION ALL
SELECT 'discord_username', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'discord_username')
UNION ALL
SELECT 'discord_email', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'discord_email')
UNION ALL
SELECT 'discord_connected_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'discord_connected_at')
UNION ALL
SELECT 'discord_joined', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'discord_joined')
UNION ALL
SELECT 'twitter_provider_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twitter_provider_id')
UNION ALL
SELECT 'twitter_username', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twitter_username')
UNION ALL
SELECT 'twitter_email', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twitter_email')
UNION ALL
SELECT 'twitter_connected_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twitter_connected_at')
UNION ALL
SELECT 'wallet_address', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wallet_address')
UNION ALL
SELECT 'wallet_connected_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wallet_connected_at')
UNION ALL
SELECT 'referral_code', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code')
UNION ALL
SELECT 'referred_by', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by')
UNION ALL
SELECT 'referral_count', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_count')
UNION ALL
SELECT 'referral_completed_count', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_completed_count')
UNION ALL
SELECT 'created_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at')
UNION ALL
SELECT 'updated_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at');

-- ========================================
-- 4. CREATE MISSING REFERRAL COLUMNS (IF NEEDED)
-- ========================================
-- Run this ONLY if referral columns don't exist

DO $$ 
BEGIN
    -- Add referral_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code TEXT;
        RAISE NOTICE 'Added referral_code column';
    END IF;

    -- Add referred_by column as TEXT (not UUID!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
        ALTER TABLE users ADD COLUMN referred_by TEXT;
        RAISE NOTICE 'Added referred_by column';
    ELSE
        -- If column exists but is UUID type, convert to TEXT
        IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') = 'uuid' THEN
            -- First convert any UUID values to referral codes
            UPDATE users u1
            SET referred_by = (
                SELECT u2.referral_code::text
                FROM users u2 
                WHERE u2.id = u1.referred_by::uuid
            )
            WHERE referred_by IS NOT NULL;
            
            -- Then change column type
            ALTER TABLE users ALTER COLUMN referred_by TYPE TEXT USING referred_by::TEXT;
            RAISE NOTICE 'Converted referred_by from UUID to TEXT';
        END IF;
    END IF;

    -- Add referral_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_count') THEN
        ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added referral_count column';
    END IF;

    -- Add referral_completed_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_completed_count') THEN
        ALTER TABLE users ADD COLUMN referral_completed_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added referral_completed_count column';
    END IF;
END $$;

-- ========================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ========================================
-- Create indexes if they don't exist

CREATE INDEX IF NOT EXISTS idx_users_discord_provider_id ON users(discord_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_twitter_provider_id ON users(twitter_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- ========================================
-- 6. ADD UNIQUE CONSTRAINTS
-- ========================================
-- Ensure referral codes are unique

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_referral_code_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);
        RAISE NOTICE 'Added unique constraint on referral_code';
    END IF;
END $$;

-- ========================================
-- 7. CHECK CURRENT DATA
-- ========================================
SELECT 
    COUNT(*) as total_users,
    COUNT(discord_provider_id) as users_with_discord,
    COUNT(twitter_provider_id) as users_with_twitter,
    COUNT(wallet_address) as users_with_wallet,
    COUNT(referral_code) as users_with_referral_code,
    COUNT(referred_by) as users_who_were_referred
FROM users;

-- ========================================
-- 8. CHECK YOUR SPECIFIC ACCOUNTS
-- ========================================
SELECT 
    discord_username,
    discord_provider_id,
    twitter_provider_id IS NOT NULL as has_twitter,
    wallet_address IS NOT NULL as has_wallet,
    referral_code,
    referred_by,
    referral_count,
    referral_completed_count,
    created_at
FROM users
WHERE discord_provider_id IN ('1306888014408187967', '922331804206268467')
ORDER BY created_at;

-- ========================================
-- 9. CHECK REFERRAL RELATIONSHIPS
-- ========================================
SELECT 
    referrer.discord_username as referrer_name,
    referrer.referral_code,
    referrer.referral_completed_count,
    COUNT(referred.id) as actual_referrals
FROM users referrer
LEFT JOIN users referred ON referred.referred_by = referrer.referral_code
WHERE referrer.referral_code IS NOT NULL
GROUP BY referrer.id, referrer.discord_username, referrer.referral_code, referrer.referral_completed_count
ORDER BY referrer.created_at DESC;

-- ========================================
-- 10. FIX DATA INCONSISTENCIES
-- ========================================
-- Update referral_completed_count to match actual completed referrals

UPDATE users
SET referral_completed_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
    AND u2.wallet_address IS NOT NULL
)
WHERE referral_code IS NOT NULL;

-- Update referral_count to match total referrals
UPDATE users
SET referral_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
)
WHERE referral_code IS NOT NULL;

-- ========================================
-- 11. FINAL VERIFICATION
-- ========================================
SELECT 
    '✅ Database Structure Verified' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE referral_code IS NOT NULL) as users_with_referral_codes,
    (SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL) as referred_users;
