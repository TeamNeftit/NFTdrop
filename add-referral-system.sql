-- Add referral columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_completed_count INTEGER DEFAULT 0;

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_uuid UUID) 
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    -- Generate code from first 8 chars of UUID
    code := UPPER(SUBSTRING(REPLACE(user_uuid::TEXT, '-', ''), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
    
    -- If exists, append random chars
    WHILE exists LOOP
        code := code || CHR(65 + FLOOR(RANDOM() * 26)::INT);
        SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to update referral counts
CREATE OR REPLACE FUNCTION update_referral_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user completes wallet submission (all tasks done)
    IF NEW.wallet_address IS NOT NULL AND OLD.wallet_address IS NULL THEN
        -- If this user was referred by someone
        IF NEW.referred_by IS NOT NULL THEN
            -- Increment the referrer's completed count
            UPDATE users 
            SET referral_completed_count = referral_completed_count + 1
            WHERE referral_code = NEW.referred_by;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referral count updates
DROP TRIGGER IF EXISTS trigger_update_referral_counts ON users;
CREATE TRIGGER trigger_update_referral_counts
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_counts();

-- Update existing users to have referral codes
UPDATE users 
SET referral_code = generate_referral_code(id)
WHERE referral_code IS NULL;

-- Create view for referral stats
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    u.id,
    u.discord_username,
    u.referral_code,
    u.referral_completed_count,
    COUNT(r.id) as total_referrals,
    COUNT(CASE WHEN r.wallet_address IS NOT NULL THEN 1 END) as completed_referrals
FROM users u
LEFT JOIN users r ON r.referred_by = u.referral_code
GROUP BY u.id, u.discord_username, u.referral_code, u.referral_completed_count;

COMMENT ON COLUMN users.referral_code IS 'Unique referral code for this user';
COMMENT ON COLUMN users.referred_by IS 'Referral code of the user who referred this user';
COMMENT ON COLUMN users.referral_count IS 'Total number of users who used this referral code';
COMMENT ON COLUMN users.referral_completed_count IS 'Number of referred users who completed all tasks';
