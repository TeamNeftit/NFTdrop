-- 🔍 CHECK REFERRAL STATUS RIGHT NOW

-- 1. Check first account (referrer) - Discord ID: 1306888014408187967
SELECT 
    discord_username,
    discord_provider_id,
    referral_code,
    referral_count,
    referral_completed_count,
    wallet_address IS NOT NULL as has_wallet
FROM users
WHERE discord_provider_id = '1306888014408187967';

-- Expected: referral_code = '3041A2DD', referral_completed_count should be 1

-- 2. Check second account (friend) - Discord ID: 922331804206268467
SELECT 
    discord_username,
    discord_provider_id,
    referral_code,
    referred_by,
    wallet_address IS NOT NULL as has_wallet
FROM users
WHERE discord_provider_id = '922331804206268467';

-- Expected: referred_by = '3041A2DD', has_wallet = true

-- 3. If referred_by is NULL, manually set it:
/*
UPDATE users
SET referred_by = '3041A2DD'
WHERE discord_provider_id = '922331804206268467';
*/

-- 4. Then manually increment the referrer's count:
/*
UPDATE users
SET referral_completed_count = referral_completed_count + 1
WHERE referral_code = '3041A2DD';
*/

-- 5. Verify the fix:
SELECT 
    discord_username,
    referral_code,
    referral_completed_count
FROM users
WHERE referral_code = '3041A2DD';
