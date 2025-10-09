-- Create users table with all social connections in one row
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Twitter/X data
    twitter_provider_id TEXT UNIQUE,
    twitter_username TEXT,
    twitter_email TEXT,
    twitter_connected_at TIMESTAMP WITH TIME ZONE,
    twitter_social_address TEXT,
    
    -- Discord data
    discord_provider_id TEXT UNIQUE,
    discord_username TEXT,
    discord_email TEXT,
    discord_connected_at TIMESTAMP WITH TIME ZONE,
    discord_social_address TEXT,
    discord_joined BOOLEAN DEFAULT FALSE,
    discord_joined_at TIMESTAMP WITH TIME ZONE,
    
    -- Wallet data
    wallet_address TEXT,
    wallet_connected_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_eligible BOOLEAN DEFAULT FALSE,
    tasks_completed INTEGER DEFAULT 0,
    followed_neftit BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_twitter_provider_id ON users(twitter_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_discord_provider_id ON users(discord_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Create a view for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(twitter_provider_id) as twitter_users,
    COUNT(discord_provider_id) as discord_users,
    COUNT(wallet_address) as wallet_users,
    COUNT(CASE WHEN is_eligible = TRUE THEN 1 END) as eligible_users
FROM users;

-- Function to check if social account is already connected
CREATE OR REPLACE FUNCTION check_social_connection(
    provider_type TEXT,
    provider_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF provider_type = 'twitter' THEN
        RETURN EXISTS(SELECT 1 FROM users WHERE twitter_provider_id = provider_id);
    ELSIF provider_type = 'discord' THEN
        RETURN EXISTS(SELECT 1 FROM users WHERE discord_provider_id = provider_id);
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to update user social connection
CREATE OR REPLACE FUNCTION update_social_connection(
    provider_type TEXT,
    provider_id TEXT,
    username TEXT,
    email TEXT,
    social_address TEXT
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Check if this social account is already connected
    IF check_social_connection(provider_type, provider_id) THEN
        RAISE EXCEPTION 'Social account already connected to another user';
    END IF;
    
    -- Try to find existing user by other social connections
    SELECT id INTO user_id FROM users 
    WHERE (twitter_provider_id IS NOT NULL OR discord_provider_id IS NOT NULL)
    LIMIT 1;
    
    -- If no existing user found, create new one
    IF user_id IS NULL THEN
        INSERT INTO users (id) VALUES (gen_random_uuid()) RETURNING id INTO user_id;
    END IF;
    
    -- Update the appropriate social connection
    IF provider_type = 'twitter' THEN
        UPDATE users SET 
            twitter_provider_id = provider_id,
            twitter_username = username,
            twitter_email = email,
            twitter_connected_at = NOW(),
            twitter_social_address = social_address,
            updated_at = NOW()
        WHERE id = user_id;
    ELSIF provider_type = 'discord' THEN
        UPDATE users SET 
            discord_provider_id = provider_id,
            discord_username = username,
            discord_email = email,
            discord_connected_at = NOW(),
            discord_social_address = social_address,
            updated_at = NOW()
        WHERE id = user_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;