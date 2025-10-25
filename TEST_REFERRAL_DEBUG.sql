-- 🔍 REFERRAL SYSTEM DEBUG QUERIES
-- Run these in Supabase SQL Editor to diagnose issues

-- ============================================
-- 1. CHECK ALL USERS AND THEIR REFERRAL DATA
-- ============================================
SELECT 
    discord_username,
    discord_provider_id,
    referral_code,
    referred_by,
    referral_count,
    referral_completed_count,
    discord_joined,
    twitter_provider_id IS NOT NULL as has_twitter,
    wallet_address IS NOT NULL as has_wallet,
    created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- 2. CHECK WHO REFERRED WHOM
-- ============================================
SELECT 
    referrer.discord_username as referrer_name,
    referrer.referral_code as referrer_code,
    referrer.referral_count as total_referrals,
    referrer.referral_completed_count as completed_referrals,
    referred.discord_username as referred_user,
    referred.referred_by,
    referred.wallet_address IS NOT NULL as completed_tasks
FROM users referrer
LEFT JOIN users referred ON referred.referred_by = referrer.referral_code
WHERE referrer.referral_code IS NOT NULL
ORDER BY referrer.created_at DESC;

-- ============================================
-- 3. CHECK SPECIFIC USER (Replace Discord ID)
-- ============================================
SELECT 
    id,
    discord_username,
    discord_provider_id,
    discord_joined,
    twitter_provider_id,
    wallet_address,
    referral_code,
    referred_by,
    referral_count,
    referral_completed_count
FROM users
WHERE discord_provider_id = '1306888014408187967'; -- Replace with your Discord ID

-- ============================================
-- 4. CHECK IF REFERRAL CODE EXISTS
-- ============================================
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE referral_code = '2D0895A4'; -- Replace with your referral code

-- ============================================
-- 5. CHECK USERS WHO WERE REFERRED
-- ============================================
SELECT 
    discord_username,
    discord_provider_id,
    referred_by,
    discord_joined,
    twitter_provider_id IS NOT NULL as has_twitter,
    wallet_address IS NOT NULL as has_wallet
FROM users
WHERE referred_by IS NOT NULL;

-- ============================================
-- 6. FIX: Manually update referral count
-- ============================================
-- Run this if counts are wrong
UPDATE users
SET referral_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
),
referral_completed_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
    AND u2.wallet_address IS NOT NULL
)
WHERE referral_code IS NOT NULL;

-- ============================================
-- 7. CHECK COLUMN TYPES
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('referral_code', 'referred_by', 'referral_count', 'referral_completed_count');

-- ============================================
-- 8. TEST: Manually apply referral
-- ============================================
-- Replace values below with actual data
/*
UPDATE users
SET referred_by = '2D0895A4'  -- Referrer's code
WHERE discord_provider_id = 'FRIEND_DISCORD_ID';  -- Friend's Discord ID
*/

-- ============================================
-- 9. TEST: Manually increment referral count
-- ============================================
-- Replace referral code below
/*
UPDATE users
SET referral_completed_count = referral_completed_count + 1
WHERE referral_code = '2D0895A4';
*/

-- ============================================
-- 10. VERIFY REFERRAL SYSTEM INTEGRITY
-- ============================================
SELECT 
    'Total Users' as metric,
    COUNT(*) as value
FROM users
UNION ALL
SELECT 
    'Users with Referral Code',
    COUNT(*)
FROM users
WHERE referral_code IS NOT NULL
UNION ALL
SELECT 
    'Users who were Referred',
    COUNT(*)
FROM users
WHERE referred_by IS NOT NULL
UNION ALL
SELECT 
    'Completed Referrals',
    COUNT(*)
FROM users
WHERE referred_by IS NOT NULL
AND wallet_address IS NOT NULL;
