-- Add discord_joined and discord_joined_at columns to users table
-- Run this in your Supabase SQL editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_joined BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_joined_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have discord_joined = false
UPDATE users 
SET discord_joined = FALSE 
WHERE discord_joined IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('discord_joined', 'discord_joined_at');
