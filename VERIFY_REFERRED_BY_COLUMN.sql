-- ========================================
-- VERIFY referred_by COLUMN IS CORRECT
-- ========================================

-- 1. Check referred_by column type
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by');

-- Expected:
-- referral_code: text
-- referred_by: text (NOT uuid!)

-- ========================================
-- 2. Check your current data
-- ========================================
SELECT 
    discord_username,
    discord_provider_id,
    referral_code,
    referred_by,
    CASE 
        WHEN referred_by IS NULL THEN 'No referrer'
        WHEN referred_by ~ '^[0-9A-F]{8}$' THEN 'Referral CODE (CORRECT!)'
        WHEN referred_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID (WRONG!)'
        ELSE 'Unknown format'
    END as referred_by_format
FROM users
WHERE discord_provider_id IN ('1306888014408187967', '922331804206268467');

-- ========================================
-- 3. If referred_by is UUID, convert to CODE
-- ========================================
-- Only run this if Step 2 shows "UUID (WRONG!)"

/*
-- Get the referrer's code from their UUID
UPDATE users u1
SET referred_by = (
    SELECT u2.referral_code 
    FROM users u2 
    WHERE u2.id = u1.referred_by::uuid
)
WHERE referred_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
*/

-- ========================================
-- 4. Verify referral relationships
-- ========================================
SELECT 
    'Referrer' as role,
    u1.discord_username,
    u1.referral_code,
    u1.referral_completed_count,
    (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = u1.referral_code) as actual_referrals
FROM users u1
WHERE u1.referral_code = '3041A2DD'

UNION ALL

SELECT 
    'Referred Friend' as role,
    u1.discord_username,
    u1.referred_by as referral_code,
    NULL as referral_completed_count,
    NULL as actual_referrals
FROM users u1
WHERE u1.discord_provider_id = '922331804206268467';

-- Expected:
-- Referrer: referral_code = '3041A2DD', actual_referrals = 1
-- Friend: referred_by = '3041A2DD'

-- ========================================
-- 5. Fix your friend's referred_by if NULL
-- ========================================
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467'
AND referred_by IS NULL;

-- ========================================
-- 6. Update your referral count
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
WHERE referral_code = '3041A2DD';

-- ========================================
-- 7. Final verification
-- ========================================
SELECT 
    u1.discord_username as referrer,
    u1.referral_code,
    u1.referral_completed_count,
    u2.discord_username as friend,
    u2.referred_by,
    u2.wallet_address IS NOT NULL as friend_completed
FROM users u1
LEFT JOIN users u2 ON u2.referred_by = u1.referral_code
WHERE u1.referral_code = '3041A2DD';

-- Expected:
-- referrer: your username
-- referral_code: 3041A2DD
-- referral_completed_count: 1
-- friend: cryptogenxz
-- referred_by: 3041A2DD
-- friend_completed: true
