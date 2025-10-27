-- Create OAuth States Table for Vercel Serverless Compatibility
-- This table stores OAuth state parameters to work with stateless serverless functions

CREATE TABLE IF NOT EXISTS oauth_states (
    id BIGSERIAL PRIMARY KEY,
    state_key TEXT UNIQUE NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_key ON oauth_states(state_key);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Enable Row Level Security
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (since this is server-side only)
CREATE POLICY "Allow all operations on oauth_states" ON oauth_states
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to automatically clean up expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired states
-- (You can set this up in Supabase Dashboard -> Database -> Cron Jobs)
-- SELECT cron.schedule('cleanup-oauth-states', '0 * * * *', 'SELECT cleanup_expired_oauth_states()');

COMMENT ON TABLE oauth_states IS 'Stores OAuth state parameters for serverless function compatibility';
COMMENT ON COLUMN oauth_states.state_key IS 'Unique state identifier for OAuth flow';
COMMENT ON COLUMN oauth_states.state_data IS 'JSON data containing timestamp, codeVerifier, accessToken, etc.';
COMMENT ON COLUMN oauth_states.expires_at IS 'Expiration time (1 hour from creation)';
