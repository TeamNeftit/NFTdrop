-- ========================================
-- FIX: Correct the double-counted referrals
-- ========================================

-- Step 1: Check current state
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count,
    (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.referral_code) as actual_total_referrals,
    (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.referral_code AND u2.wallet_address IS NOT NULL) as actual_completed_referrals
FROM users
WHERE referral_code = '28D65093';

-- You should see:
-- referral_count: 1 (correct)
-- referral_completed_count: 2 (WRONG - should be 1)
-- actual_completed_referrals: 1 (this is the real count)

-- ========================================
-- Step 2: Fix the double count
-- ========================================

-- Reset your referral_completed_count to the actual count
UPDATE users
SET referral_completed_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
    AND u2.wallet_address IS NOT NULL
)
WHERE referral_code = '28D65093';

-- ========================================
-- Step 3: Verify the fix
-- ========================================
SELECT 
    discord_username,
    referral_code,
    referral_count,
    referral_completed_count
FROM users
WHERE referral_code = '28D65093';

-- Should now show:
-- referral_count: 1
-- referral_completed_count: 1 ✅

-- ========================================
-- Step 4: Fix ALL users (in case others have same issue)
-- ========================================
UPDATE users
SET referral_completed_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
    AND u2.wallet_address IS NOT NULL
),
referral_count = (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = users.referral_code
)
WHERE referral_code IS NOT NULL;

-- ========================================
-- Step 5: Final verification
-- ========================================
SELECT 
    u1.discord_username as referrer,
    u1.referral_code,
    u1.referral_count,
    u1.referral_completed_count,
    COUNT(u2.id) as actual_referrals,
    COUNT(CASE WHEN u2.wallet_address IS NOT NULL THEN 1 END) as actual_completed
FROM users u1
LEFT JOIN users u2 ON u2.referred_by = u1.referral_code
WHERE u1.referral_code IS NOT NULL
GROUP BY u1.id, u1.discord_username, u1.referral_code, u1.referral_count, u1.referral_completed_count
ORDER BY u1.created_at DESC;

-- This shows all referrers with their counts
-- referral_count should match actual_referrals
-- referral_completed_count should match actual_completed
