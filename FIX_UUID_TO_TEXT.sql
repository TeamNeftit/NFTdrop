-- ========================================
-- FIX: Convert referred_by from UUID to TEXT
-- This is the CORRECT way to do it
-- ========================================

-- Step 1: Check current type
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by');

-- ========================================
-- Step 2: Create a temporary column
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_temp TEXT;

-- ========================================
-- Step 3: Copy UUID data as text to temp column
-- ========================================
UPDATE users
SET referred_by_temp = referred_by::TEXT
WHERE referred_by IS NOT NULL;

-- ========================================
-- Step 4: Convert any UUIDs to referral codes
-- ========================================
UPDATE users u1
SET referred_by_temp = (
    SELECT u2.referral_code 
    FROM users u2 
    WHERE u2.id::TEXT = u1.referred_by_temp
)
WHERE referred_by_temp IS NOT NULL
AND EXISTS (
    SELECT 1 FROM users u2 WHERE u2.id::TEXT = u1.referred_by_temp
);

-- ========================================
-- Step 5: Drop old UUID column
-- ========================================
ALTER TABLE users DROP COLUMN referred_by;

-- ========================================
-- Step 6: Rename temp column to referred_by
-- ========================================
ALTER TABLE users RENAME COLUMN referred_by_temp TO referred_by;

-- ========================================
-- Step 7: Verify the change
-- ========================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'referred_by';

-- Should show: data_type = 'text'

-- ========================================
-- Step 8: Check your data
-- ========================================
SELECT 
    discord_username,
    referral_code,
    referred_by,
    CASE 
        WHEN referred_by IS NULL THEN 'No referrer'
        WHEN LENGTH(referred_by) = 8 THEN 'Referral CODE ✅'
        WHEN LENGTH(referred_by) = 36 THEN 'Still UUID (check Step 4)'
        ELSE 'Unknown'
    END as format
FROM users
WHERE discord_provider_id IN ('1306888014408187967', '922331804206268467');

-- ========================================
-- Step 9: Set your friend's referrer
-- ========================================
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467'
AND (referred_by IS NULL OR referred_by = '');

-- ========================================
-- Step 10: Update your referral count
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
-- Step 11: Final verification
-- ========================================
SELECT 
    'Your Account' as account,
    discord_username,
    referral_code,
    referred_by,
    referral_completed_count
FROM users
WHERE referral_code = '3041A2DD'

UNION ALL

SELECT 
    'Friend Account' as account,
    discord_username,
    referral_code,
    referred_by,
    NULL as referral_completed_count
FROM users
WHERE discord_provider_id = '922331804206268467';

-- Expected Result:
-- Your Account: referral_code='3041A2DD', referred_by=NULL, referral_completed_count=1
-- Friend Account: referral_code='BC02346B', referred_by='3041A2DD'
