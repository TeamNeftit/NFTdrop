-- ========================================
-- FIX: Convert referred_by from UUID to TEXT
-- ========================================

-- Step 1: Check current column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by');

-- If referred_by shows "uuid", we need to convert it!

-- ========================================
-- Step 2: Convert referred_by from UUID to TEXT
-- ========================================

-- First, convert any existing UUID values to their referral codes
UPDATE users u1
SET referred_by = (
    SELECT u2.referral_code 
    FROM users u2 
    WHERE u2.id = u1.referred_by::uuid
)
WHERE referred_by IS NOT NULL
AND EXISTS (
    SELECT 1 FROM users u2 WHERE u2.id = u1.referred_by::uuid
);

-- Now change the column type from UUID to TEXT
ALTER TABLE users 
ALTER COLUMN referred_by TYPE TEXT 
USING referred_by::TEXT;

-- ========================================
-- Step 3: Verify the change
-- ========================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'referred_by';

-- Should now show: data_type = 'text'

-- ========================================
-- Step 4: Check your data
-- ========================================
SELECT 
    discord_username,
    referral_code,
    referred_by,
    LENGTH(referred_by) as referred_by_length,
    CASE 
        WHEN referred_by IS NULL THEN 'No referrer'
        WHEN LENGTH(referred_by) = 8 THEN 'Referral CODE ✅'
        WHEN LENGTH(referred_by) = 36 THEN 'UUID (needs conversion)'
        ELSE 'Unknown format'
    END as format
FROM users
WHERE discord_provider_id IN ('1306888014408187967', '922331804206268467');

-- ========================================
-- Step 5: Set your friend's referrer
-- ========================================
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467'
AND (referred_by IS NULL OR referred_by = '');

-- ========================================
-- Step 6: Update your referral count
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
-- Step 7: Final verification
-- ========================================
SELECT 
    'Referrer' as role,
    discord_username,
    referral_code,
    referral_completed_count
FROM users
WHERE referral_code = '3041A2DD'

UNION ALL

SELECT 
    'Friend' as role,
    discord_username,
    referred_by as referral_code,
    NULL as referral_completed_count
FROM users
WHERE discord_provider_id = '922331804206268467';

-- Expected:
-- Referrer: referral_code = '3041A2DD', referral_completed_count = 1
-- Friend: referred_by = '3041A2DD'
