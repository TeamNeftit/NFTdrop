-- ========================================
-- MANUAL FIX FOR YOUR REFERRAL SYSTEM
-- Run these queries ONE BY ONE in Supabase
-- ========================================

-- STEP 1: Check current state
-- ========================================
SELECT 
    'First Account (Referrer)' as account_type,
    discord_username,
    discord_provider_id,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE discord_provider_id = '1306888014408187967'

UNION ALL

SELECT 
    'Second Account (Friend)' as account_type,
    discord_username,
    discord_provider_id,
    referred_by as referral_code,
    NULL as referral_count,
    NULL as referral_completed_count
FROM users
WHERE discord_provider_id = '922331804206268467';

-- ========================================
-- STEP 2: Fix the friend's referred_by field
-- ========================================
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467'
AND referred_by IS NULL;

-- ========================================
-- STEP 3: Increment the referrer's count
-- ========================================
UPDATE users
SET referral_completed_count = COALESCE(referral_completed_count, 0) + 1,
    referral_count = COALESCE(referral_count, 0) + 1
WHERE referral_code = '3041A2DD';

-- ========================================
-- STEP 4: Verify the fix
-- ========================================
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE referral_code = '3041A2DD';

-- Expected result: referral_completed_count = 1

-- ========================================
-- STEP 5: Check friend has referrer set
-- ========================================
SELECT 
    discord_username,
    referred_by,
    wallet_address IS NOT NULL as has_wallet
FROM users
WHERE discord_provider_id = '922331804206268467';

-- Expected result: referred_by = '3041A2DD', has_wallet = true
