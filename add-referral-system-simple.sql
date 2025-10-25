-- Simple Referral System Migration
-- Run this in Supabase SQL Editor

-- Step 1: Add referral columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_completed_count INTEGER DEFAULT 0;

-- Step 2: Create unique constraint on referral_code (after column exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_referral_code_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);
    END IF;
END $$;

-- Step 3: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Step 4: Update existing users to have referral codes
UPDATE users 
SET referral_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE referral_code IS NULL AND wallet_address IS NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN users.referral_code IS 'Unique referral code for this user';
COMMENT ON COLUMN users.referred_by IS 'Referral code of the user who referred this user';
COMMENT ON COLUMN users.referral_count IS 'Total number of users who used this referral code';
COMMENT ON COLUMN users.referral_completed_count IS 'Number of referred users who completed all tasks';

-- Done! Referral system columns added successfully.
