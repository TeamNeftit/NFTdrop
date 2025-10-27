const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('X_CLIENT_ID:', process.env.X_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('X_CLIENT_SECRET:', process.env.X_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID ? 'SET' : 'NOT SET');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('=====================================');

// Middleware
app.use(cors());
app.use(express.json());

// Configuration - All from .env file
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || `${BASE_URL}/auth/x/callback`;

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${BASE_URL}/auth/discord/callback`;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_INVITE_LINK = process.env.DISCORD_INVITE_LINK || 'https://discord.com/invite/your_invite_code_here';
const NEFTIT_X_USERNAME = process.env.NEFTIT_X_USERNAME || 'neftitxyz';

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Only create Supabase client if we have valid credentials
let supabase = null;
if (SUPABASE_URL && SUPABASE_URL !== 'your_supabase_url' && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your_supabase_anon_key') {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
    } catch (error) {
        console.log('Supabase initialization failed:', error.message);
    }
} else {
    console.log('Supabase credentials not provided - running without database');
}

// Store for state verification - Using Supabase for Vercel serverless compatibility
const stateStore = {
    async set(key, value) {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using in-memory store');
            if (!this._memoryStore) this._memoryStore = new Map();
            return this._memoryStore.set(key, value);
        }
        try {
            const { error } = await supabase
                .from('oauth_states')
                .upsert({
                    state_key: key,
                    state_data: value,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
                });
            if (error) throw error;
        } catch (error) {
            console.error('Error storing state in Supabase:', error);
            // Fallback to memory
            if (!this._memoryStore) this._memoryStore = new Map();
            this._memoryStore.set(key, value);
        }
    },
    
    async get(key) {
        if (!supabase) {
            return this._memoryStore ? this._memoryStore.get(key) : undefined;
        }
        try {
            const { data, error } = await supabase
                .from('oauth_states')
                .select('state_data')
                .eq('state_key', key)
                .single();
            if (error) throw error;
            return data ? data.state_data : undefined;
        } catch (error) {
            console.error('Error getting state from Supabase:', error);
            return this._memoryStore ? this._memoryStore.get(key) : undefined;
        }
    },
    
    async has(key) {
        if (!supabase) {
            return this._memoryStore ? this._memoryStore.has(key) : false;
        }
        try {
            const { data, error } = await supabase
                .from('oauth_states')
                .select('state_key')
                .eq('state_key', key)
                .single();
            return !!data && !error;
        } catch (error) {
            return this._memoryStore ? this._memoryStore.has(key) : false;
        }
    },
    
    async delete(key) {
        if (!supabase) {
            return this._memoryStore ? this._memoryStore.delete(key) : false;
        }
        try {
            const { error } = await supabase
                .from('oauth_states')
                .delete()
                .eq('state_key', key);
            return !error;
        } catch (error) {
            console.error('Error deleting state from Supabase:', error);
            return this._memoryStore ? this._memoryStore.delete(key) : false;
        }
    },
    
    get size() {
        return this._memoryStore ? this._memoryStore.size : 0;
    },
    
    entries() {
        return this._memoryStore ? this._memoryStore.entries() : [];
    },
    
    keys() {
        return this._memoryStore ? this._memoryStore.keys() : [];
    }
};

// Cache for Neftit user ID to avoid repeated API calls
let neftitUserIdCache = null;
let neftitUserIdCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check if social account is already connected
async function checkSocialConnection(providerType, providerId) {
    if (!supabase) return false;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq(providerType === 'twitter' ? 'twitter_provider_id' : 'discord_provider_id', providerId)
            .single();
            
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking social connection:', error);
            return false;
        }
        
        return !!data; // Return true if account exists, false if not
    } catch (error) {
        console.error('Error checking social connection:', error);
        return false;
    }
}

// Helper function to check if user has submitted wallet (account locked)
async function checkUserWalletStatus(userId) {
    if (!supabase) return { walletSubmitted: false, tasks: {} };
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('twitter_provider_id, discord_provider_id, followed_neftit, wallet_address')
            .eq('id', userId)
            .single();
            
        if (error) {
            console.error('Error checking user wallet status:', error);
            return { walletSubmitted: false, tasks: {} };
        }
        
        const tasks = {
            twitter_connected: !!user.twitter_provider_id,
            discord_connected: !!user.discord_provider_id,
            followed_neftit: !!user.followed_neftit,
            wallet_submitted: !!user.wallet_address
        };
        
        return { walletSubmitted: !!user.wallet_address, tasks };
    } catch (error) {
        console.error('Error checking user wallet status:', error);
        return { walletSubmitted: false, tasks: {} };
    }
}

// Helper function to get Neftit user ID with caching
async function getNeftitUserId(accessToken) {
    const now = Date.now();
    
    // Check if we have a valid cached ID
    if (neftitUserIdCache && (now - neftitUserIdCacheTime) < CACHE_DURATION) {
        console.log('✅ Using cached Neftit user ID:', neftitUserIdCache);
        return neftitUserIdCache;
    }
    
    try {
        console.log('🔍 Fetching Neftit user ID from API...');
        const neftitResponse = await axios.get(`https://api.twitter.com/2/users/by/username/${NEFTIT_X_USERNAME}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const userId = neftitResponse.data.data.id;
        
        // Cache the result
        neftitUserIdCache = userId;
        neftitUserIdCacheTime = now;
        
        console.log('✅ Got and cached Neftit user ID:', userId);
        return userId;
    } catch (error) {
        console.error('❌ Error getting Neftit user ID:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to update user social connection
async function updateSocialConnection(providerType, providerId, username, email, socialAddress) {
    if (!supabase) {
        throw new Error('Database not available');
    }
    
    try {
        // First, check if this specific social account is already connected
        const { data: existingSocialUser } = await supabase
            .from('users')
            .select('id')
            .eq(providerType === 'twitter' ? 'twitter_provider_id' : 'discord_provider_id', providerId)
            .single();
        
        let userId;
        
        if (existingSocialUser) {
            // Update existing user with this social account
            userId = existingSocialUser.id;
            console.log(`🔄 Updating existing user ${userId} with ${providerType} connection`);
        } else {
        // Try to find existing user by other social connections
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .or(`twitter_provider_id.not.is.null,discord_provider_id.not.is.null`)
            .limit(1)
            .single();
        
        if (existingUser) {
            userId = existingUser.id;
                console.log(`🔄 Adding ${providerType} to existing user ${userId}`);
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({})
                .select('id')
                .single();
                
            if (createError) throw createError;
            userId = newUser.id;
                console.log(`✅ Creating new user ${userId} with ${providerType} connection`);
            }
        }
        
        // Update the appropriate social connection
        const updateData = {};
        if (providerType === 'twitter') {
            updateData.twitter_provider_id = providerId;
            updateData.twitter_username = username;
            updateData.twitter_email = email;
            updateData.twitter_connected_at = new Date().toISOString();
            updateData.twitter_social_address = socialAddress;
        } else if (providerType === 'discord') {
            updateData.discord_provider_id = providerId;
            updateData.discord_username = username;
            updateData.discord_email = email;
            updateData.discord_connected_at = new Date().toISOString();
            updateData.discord_social_address = socialAddress;
        }
        
        updateData.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
            
        if (updateError) throw updateError;
        
        return userId;
    } catch (error) {
        console.error('Error updating social connection:', error);
        throw error;
    }
}

// X (Twitter) OAuth2 Routes
app.get('/auth/x', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // Store state and code verifier
    stateStore.set(state, { 
        timestamp: Date.now(), 
        codeVerifier: codeVerifier 
    });
    
    console.log('X OAuth2 - Starting authentication flow');
    console.log('Client ID from .env:', X_CLIENT_ID);
    console.log('Client Secret from .env:', X_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('Redirect URI:', X_REDIRECT_URI);
    console.log('State:', state);
    console.log('Code Challenge:', codeChallenge);
    
    // Validate credentials
    if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
        return res.status(500).send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>Configuration Error</h2>
                    <p>X OAuth2 is not properly configured. Please check your .env file.</p>
                    <p>Missing: ${!X_CLIENT_ID ? 'X_CLIENT_ID' : ''} ${!X_CLIENT_SECRET ? 'X_CLIENT_SECRET' : ''}</p>
                    <p>Make sure your .env file contains:</p>
                    <pre>X_CLIENT_ID=your_client_id_here
X_CLIENT_SECRET=your_client_secret_here</pre>
                </body>
            </html>
        `);
    }
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${X_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(X_REDIRECT_URI)}&` +
        `scope=tweet.read%20users.read%20follows.read%20follows.write%20offline.access&` +
        `state=${state}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;
    
    console.log('Redirecting to:', authUrl);
    
    // Directly redirect to X authorization
    res.redirect(authUrl);
});

app.get('/auth/x/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    
    console.log('🔵 X OAuth2 Callback received');
    console.log('🔵 Code:', code ? 'Present' : 'Missing');
    console.log('🔵 State:', state);
    console.log('🔵 Error:', error);
    console.log('🔵 Error Description:', error_description);
    console.log('🔵 Full query:', req.query);
    
    // Handle OAuth errors
    if (error) {
        console.log('OAuth error from X:', error, error_description);
        console.log('Full query params:', req.query);
        return res.send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>X Authentication Error</h2>
                    <p><strong>Error:</strong> ${error}</p>
                    <p><strong>Description:</strong> ${error_description || 'No description provided'}</p>
                    <p><strong>Full Query:</strong> ${JSON.stringify(req.query, null, 2)}</p>
                    <h3>Common Solutions:</h3>
                    <ul>
                        <li>Check if redirect URI matches exactly in X Developer Portal</li>
                        <li>Verify you're using OAuth 2.0 Client ID (not API Key)</li>
                        <li>Make sure OAuth 2.0 is enabled for your app</li>
                        <li>Check if app type is "Web App" not "Native App"</li>
                    </ul>
                    <script>
                        window.opener.postMessage({
                            type: 'X_AUTH_ERROR',
                            error: '${error}',
                            description: '${error_description || ''}'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
    
    if (!code) {
        console.log('No authorization code received');
        return res.send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>No Authorization Code</h2>
                    <p>X did not provide an authorization code. This usually means the user denied access.</p>
                    <script>
                        window.opener.postMessage({
                            type: 'X_AUTH_ERROR',
                            error: 'No authorization code'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
    
    if (!stateStore.has(state)) {
        console.log('Invalid state parameter');
        return res.status(400).send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>Invalid State</h2>
                    <p>Invalid state parameter. This might be a security issue.</p>
                    <script>
                        window.opener.postMessage({
                            type: 'X_AUTH_ERROR',
                            error: 'Invalid state'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
    
    try {
        // Get stored code verifier
        let stateData = stateStore.get(state);
        if (!stateData || !stateData.codeVerifier) {
            throw new Error('Invalid state or missing code verifier');
        }
        
        // Exchange code for access token using URL-encoded form data
        const tokenData = new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: X_CLIENT_ID,
            redirect_uri: X_REDIRECT_URI,
            code_verifier: stateData.codeVerifier
        });
        
        console.log('🔵 Exchanging code for access token...');
        console.log('🔵 Using code verifier:', stateData.codeVerifier);
        
        const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`
            }
        });
        
        console.log('🔵 Token response:', tokenResponse.data);
        const { access_token } = tokenResponse.data;
        
        // Try to get user info first, but fallback to direct creation if rate limited
        let userId, userData;
        
        try {
            console.log('🔵 Attempting to get user info from Twitter API...');
        const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
            userData = userResponse.data.data;
            userId = userData.id; // Use actual Twitter user ID
            console.log('🔵 Got user info from Twitter API:', userData);
            
        } catch (userError) {
            console.log('🔵 User info call failed, using fallback approach');
            console.log('🔵 Error:', userError.response?.data || userError.message);
            
            // Fallback: create a consistent user ID based on access token hash
            const crypto = require('crypto');
            const tokenHash = crypto.createHash('md5').update(access_token).digest('hex').substring(0, 16);
            userId = 'twitter_' + tokenHash;
            userData = {
                id: userId,
                username: 'twitter_user',
                email: null
            };
            
            console.log('🔵 Using fallback user creation:', userData);
        }
        
        // Store access token for follow verification later
        stateData = stateStore.get(state);
        if (stateData) {
            stateData.accessToken = access_token;
            stateData.userId = userId;
            stateStore.set(state, stateData);
        }
        
        // Smart session management - check if this account is already connected
        console.log('🔍 Supabase client status:', supabase ? 'Connected' : 'Not connected');
        
        if (supabase) {
            try {
                const socialAddress = `social:twitter:${userId}`;
                
                console.log(`🔍 Checking if Twitter account ${userId} exists in database...`);
                console.log(`🔍 User data from Twitter:`, userData);
                
                // Check if this Twitter account is already connected
                const { data: existingUser, error: queryError } = await supabase
                    .from('users')
                    .select('id, twitter_provider_id, discord_provider_id, wallet_address')
                    .eq('twitter_provider_id', userId)
                    .single();
                
                console.log(`🔍 Database query result:`, { existingUser, queryError });
                
                if (queryError && queryError.code !== 'PGRST116') {
                    // PGRST116 = no rows found, which is fine
                    throw queryError;
                }
                
                if (existingUser) {
                    console.log('🔄 Twitter account already exists in database');
                    console.log('📊 User data:', {
                        id: existingUser.id,
                        hasWallet: !!existingUser.wallet_address,
                        hasDiscord: !!existingUser.discord_provider_id
                    });
                    
                    // Check if wallet is submitted
                    if (existingUser.wallet_address) {
                        // Account is locked - wallet submitted
                        console.log('❌ Account locked - wallet already submitted');
                        return res.send(`
                            <html>
                                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                                    <h2>Account Already Connected</h2>
                                    <p>This X account has already submitted a wallet address and cannot be used again.</p>
                                    <script>
                                        window.opener.postMessage({
                                            type: 'X_AUTH_ERROR',
                                            error: 'Account already connected with wallet'
                                        }, '${BASE_URL}');
                                        window.close();
                                    </script>
                                </body>
                            </html>
                        `);
                    } else {
                        // Account exists but no wallet - restore session
                        console.log('✅ Restoring session - no wallet submitted yet');
                        
                        // Update the existing user with fresh data
                        const { error: updateError } = await supabase
                            .from('users')
                            .update({
                                twitter_username: userData.username,
                                twitter_email: userData.email || null,
                                twitter_connected_at: new Date().toISOString(),
                                twitter_social_address: socialAddress,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingUser.id);
                        
                        if (updateError) {
                            throw updateError;
                        }
                        
                        console.log('✅ Twitter data updated for existing user');
                        
                        // Send success with existing user ID
                        return res.send(`
                            <html>
                                <body>
                                    <script>
                                        window.opener.postMessage({
                                            type: 'X_AUTH_SUCCESS',
                                            userId: '${userId}',
                                            state: '${state}',
                                            restored: true
                                        }, '${BASE_URL}');
                                        window.close();
                                    </script>
                                    <p>Session restored! You can close this window.</p>
                                </body>
                            </html>
                        `);
                    }
                } else {
                    // Twitter account not found - this is a NEW connection
                    // Frontend will link it to Discord session via /api/link-twitter-to-session
                    console.log('✅ New Twitter connection - will be linked to Discord session by frontend');
                    
                    return res.send(`
                        <html>
                            <body>
                                <script>
                                    console.log('Sending X_AUTH_SUCCESS for new Twitter account');
                                    window.opener.postMessage({
                                        type: 'X_AUTH_SUCCESS',
                                        userId: '${userId}',
                                        username: '${userData.username}',
                                        email: '${userData.email || ''}',
                                        state: '${state}',
                                        restored: false
                                    }, '${BASE_URL}');
                                    setTimeout(() => window.close(), 2000);
                                </script>
                                <p>X connected! You can close this window.</p>
                            </body>
                        </html>
                    `);
                }
            } catch (dbError) {
                console.error('❌ Database error:', dbError);
                
                // Send error message to parent window
                return res.send(`
                    <html>
                        <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                            <h2>Connection Error</h2>
                            <p>${dbError.message}</p>
                            <script>
                                window.opener.postMessage({
                                    type: 'X_AUTH_ERROR',
                                    error: '${dbError.message}'
                                }, '${BASE_URL}');
                                window.close();
                            </script>
                        </body>
                    </html>
                `);
            }
        } else {
            console.log('⚠️ Supabase not available - user data not saved to database');
            return res.send(`
                <html>
                    <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                        <h2>Database Error</h2>
                        <p>Database not available. Please try again later.</p>
                        <script>
                            window.opener.postMessage({
                                type: 'X_AUTH_ERROR',
                                error: 'Database not available'
                            }, '${BASE_URL}');
                            window.close();
                        </script>
                    </body>
                </html>
            `);
        }
        
        // Keep state for follow verification (will be cleaned up later)
        
        // Send success message to parent window
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'X_AUTH_SUCCESS',
                            userId: '${userId}',
                            state: '${state}'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                    <p>Authentication successful! You can close this window.</p>
                </body>
            </html>
        `);
        
    } catch (error) {
        console.error('🔵 X OAuth error:', error.response?.data || error.message);
        console.error('🔵 Full error:', error);
        
        // Send error message to parent window
        res.send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>X Authentication Error</h2>
                    <p>Error: ${error.message}</p>
                    <p>Details: ${JSON.stringify(error.response?.data || {})}</p>
                    <script>
                        window.opener.postMessage({
                            type: 'X_AUTH_ERROR',
                            error: '${error.message}'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
});

// Discord OAuth2 Routes
app.get('/auth/discord', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    stateStore.set(state, { timestamp: Date.now() });
    
    console.log('Discord OAuth2 - Starting authentication flow');
    console.log('Client ID:', DISCORD_CLIENT_ID);
    console.log('Redirect URI:', DISCORD_REDIRECT_URI);
    
    // Validate Discord credentials
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.status(500).send(`
            <html>
                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                    <h2>Discord Configuration Error</h2>
                    <p>Discord OAuth2 is not properly configured. Please check your .env file.</p>
                    <p>Missing: ${!DISCORD_CLIENT_ID ? 'DISCORD_CLIENT_ID' : ''} ${!DISCORD_CLIENT_SECRET ? 'DISCORD_CLIENT_SECRET' : ''}</p>
                </body>
            </html>
        `);
    }
    
    const authUrl = `https://discord.com/api/oauth2/authorize?` +
        `client_id=${DISCORD_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=identify%20guilds.join&` +
        `state=${state}`;
    
    console.log('Discord auth URL:', authUrl);
    res.redirect(authUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!stateStore.has(state)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', {
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: DISCORD_REDIRECT_URI
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const { access_token } = tokenResponse.data;
        
        // Get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        const userId = userResponse.data.id;
        
        // Add user to Discord server
        try {
            await axios.put(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
                access_token
            }, {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (joinError) {
            console.log('Discord join attempt failed:', joinError.response?.data);
        }
        
        // Smart session management - check if this account is already connected
        if (supabase) {
            try {
                const userData = userResponse.data;
                const socialAddress = `social:discord:${userId}`;
                
                console.log(`🔍 Checking if Discord account ${userId} exists in database...`);
                console.log(`🔍 User data from Discord:`, userData);
                
                // Check if this Discord account is already connected
                const { data: existingUser, error: queryError } = await supabase
                    .from('users')
                    .select('id, twitter_provider_id, discord_provider_id, wallet_address')
                    .eq('discord_provider_id', userId)
                    .single();
                
                console.log(`🔍 Database query result:`, { existingUser, queryError });
                
                if (queryError && queryError.code !== 'PGRST116') {
                    // PGRST116 = no rows found, which is fine
                    throw queryError;
                }
                
                if (existingUser) {
                    console.log('🔄 Discord account already exists in database');
                    console.log('📊 User data:', {
                        id: existingUser.id,
                        hasWallet: !!existingUser.wallet_address,
                        hasTwitter: !!existingUser.twitter_provider_id
                    });
                    
                    // Always restore session for existing Discord accounts
                    console.log('✅ Restoring Discord session');
                    console.log('📊 Session status:', {
                        hasDiscord: !!existingUser.discord_provider_id,
                        hasTwitter: !!existingUser.twitter_provider_id,
                        hasWallet: !!existingUser.wallet_address,
                        discordJoined: !!existingUser.discord_joined
                    });
                    
                    // Update the existing user with fresh data
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            discord_username: userData.username,
                            discord_email: userData.email || null,
                            discord_connected_at: new Date().toISOString(),
                            discord_social_address: socialAddress,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingUser.id);
                    
                    if (updateError) {
                        throw updateError;
                    }
                    
                    console.log('✅ Discord data updated for existing user');
                    
                    // Send success with existing user ID - frontend will restore full session
                    return res.send(`
                        <html>
                            <body>
                                <script>
                                    console.log('Sending Discord restored session message...');
                                    window.opener.postMessage({
                                        type: 'DISCORD_AUTH_SUCCESS',
                                        userId: '${userId}',
                                        restored: true
                                    }, '${BASE_URL}');
                                    console.log('Message sent, closing in 2 seconds...');
                                    setTimeout(() => window.close(), 2000);
                                </script>
                                <p>Session restored! You can close this window.</p>
                            </body>
                        </html>
                    `);
                } else {
                    // New Discord connection - ALWAYS create new user (Discord is FIRST task)
                    console.log('✅ Creating new user with Discord data (Discord is first task)');
                    
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            discord_provider_id: userId,
                            discord_username: userData.username,
                            discord_email: userData.email || null,
                            discord_connected_at: new Date().toISOString(),
                            discord_social_address: socialAddress
                        })
                        .select('id')
                        .single();
                    
                    if (createError) {
                        throw createError;
                    }
                    
                    console.log('✅ New user created with ID:', newUser.id);
                    console.log('📊 Discord Provider ID:', userId);
                    
                    // Wait a moment to ensure database commit
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Send success message for NEW user
                    return res.send(`
                        <html>
                            <body>
                                <script>
                                    console.log('Sending Discord auth success message...');
                                    window.opener.postMessage({
                                        type: 'DISCORD_AUTH_SUCCESS',
                                        userId: '${userId}',
                                        restored: false
                                    }, '${BASE_URL}');
                                    console.log('Message sent, closing in 2 seconds...');
                                    setTimeout(() => window.close(), 2000);
                                </script>
                                <p>Discord connected! You can close this window.</p>
                            </body>
                        </html>
                    `);
                }
            } catch (dbError) {
                console.error('❌ Database error:', dbError);
                
                // Send error message to parent window
                return res.send(`
                    <html>
                        <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                            <h2>Connection Error</h2>
                            <p>${dbError.message}</p>
                            <script>
                                window.opener.postMessage({
                                    type: 'DISCORD_AUTH_ERROR',
                                    error: '${dbError.message}'
                                }, '${BASE_URL}');
                                window.close();
                            </script>
                        </body>
                    </html>
                `);
            }
        } else {
            console.log('⚠️ Supabase not available - user data not saved to database');
            
            // Send success message even without database
            return res.send(`
                <html>
                    <body>
                        <script>
                            console.log('Sending Discord auth success (no DB)...');
                            window.opener.postMessage({
                                type: 'DISCORD_AUTH_SUCCESS',
                                userId: '${userId}',
                                restored: false
                            }, '${BASE_URL}');
                            console.log('Message sent, closing in 2 seconds...');
                            setTimeout(() => window.close(), 2000);
                        </script>
                        <p>Authentication successful! You can close this window.</p>
                    </body>
                </html>
            `);
        }
        
    } catch (error) {
        console.error('Discord OAuth error:', error.response?.data || error.message);
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_ERROR',
                            error: 'Authentication failed'
                        }, '${BASE_URL}');
                        window.close();
                    </script>
                    <p>Authentication failed! You can close this window.</p>
                </body>
            </html>
        `);
    }
});

// API Routes
app.get('/api/config', (req, res) => {
    res.json({
        discordInviteLink: DISCORD_INVITE_LINK,
        neftitUsername: NEFTIT_X_USERNAME,
        discordGuildId: DISCORD_GUILD_ID,
        baseUrl: BASE_URL
    });
});

// Get total participant count
app.get('/api/participant-count', async (req, res) => {
    console.log('📊 Participant count requested');
    
    if (!supabase) {
        console.log('❌ Database not available');
        return res.status(503).json({ error: 'Database not available', count: 0 });
    }
    
    try {
        // Count all users who have connected Discord (started the process)
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .not('discord_provider_id', 'is', null);
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Participant count:', count);
        
        res.json({
            success: true,
            count: count || 0
        });
        
    } catch (error) {
        console.error('❌ Error getting participant count:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get participant count',
            count: 0
        });
    }
});

app.get('/api/users', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's current status from database
app.get('/api/user-status/:twitterUserId', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { twitterUserId } = req.params;
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('twitter_provider_id', twitterUserId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(500).json({ error: error.message });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                twitter_username: user.twitter_username,
                twitter_connected: !!user.twitter_provider_id,
                discord_connected: !!user.discord_provider_id,
                followed_neftit: false, // This will be handled by follow verification
                wallet_connected: !!user.wallet_address,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user status by Discord user ID
app.get('/api/user-status-discord/:discordUserId', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { discordUserId } = req.params;
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('discord_provider_id', discordUserId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(500).json({ error: error.message });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                twitter_username: user.twitter_username,
                twitter_connected: !!user.twitter_provider_id,
                discord_connected: !!user.discord_provider_id,
                discord_provider_id: user.discord_provider_id, // Include the actual provider ID
                discord_joined: !!user.discord_joined,
                followed_neftit: false, // This will be handled by follow verification
                wallet_connected: !!user.wallet_address,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { data: users, error } = await supabase
                        .from('users')
            .select('twitter_provider_id, discord_provider_id, followed_neftit, wallet_address');
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        const stats = {
            total_users: users.length,
            x_users: users.filter(u => u.twitter_provider_id).length,
            discord_users: users.filter(u => u.discord_provider_id).length,
            followed_neftit: users.filter(u => u.followed_neftit).length,
            wallet_connected: users.filter(u => u.wallet_address).length
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if user follows @neftitxyz
// Old Twitter verification endpoint removed - now using simplified flow

// Old Twitter verification endpoints removed - now using simplified flow

// NEW: Link Twitter to existing Discord session
app.post('/api/link-twitter-to-session', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    const { discordUserId, twitterUserId, twitterUsername, twitterEmail } = req.body;
    
    if (!discordUserId || !twitterUserId) {
        return res.status(400).json({ error: 'Discord and Twitter user IDs are required' });
    }
    
    try {
        // 1. Check if Twitter account is already used in ANY account
        const { data: existingTwitter } = await supabase
            .from('users')
            .select('id, discord_provider_id')
            .eq('twitter_provider_id', twitterUserId)
            .single();
        
        if (existingTwitter) {
            return res.status(400).json({ 
                error: 'This X/Twitter account is already connected to another account',
                message: 'Please use a different X/Twitter account'
            });
        }
        
        // 2. Find user by Discord ID
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('discord_provider_id', discordUserId)
            .single();
        
        if (findError || !user) {
            return res.status(404).json({ 
                error: 'Discord session not found',
                message: 'Please connect Discord first'
            });
        }
        
        // 3. Check if user already has wallet (account locked)
        if (user.wallet_address) {
            return res.status(400).json({ 
                error: 'Account is locked',
                message: 'Wallet already submitted, cannot modify connections'
            });
        }
        
        // 4. Add Twitter to the same UUID
        const { error: updateError } = await supabase
            .from('users')
            .update({
                twitter_provider_id: twitterUserId,
                twitter_username: twitterUsername,
                twitter_email: twitterEmail,
                twitter_connected_at: new Date().toISOString(),
                twitter_social_address: `social:twitter:${twitterUserId}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Twitter linked to Discord session: ${user.id}`);
        
        res.json({ 
            success: true, 
            message: 'X/Twitter connected successfully',
            userId: user.id
        });
        
    } catch (error) {
        console.error('Error linking Twitter to session:', error);
        res.status(500).json({ error: 'Failed to link Twitter account' });
    }
});

// NEW: Verify Twitter Follow
app.post('/api/verify-twitter-follow', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    const { discordUserId } = req.body;
    
    if (!discordUserId) {
        return res.status(400).json({ error: 'Discord user ID is required' });
    }
    
    try {
        // Find user by Discord ID
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('discord_provider_id', discordUserId)
            .single();
        
        if (findError || !user) {
            return res.status(404).json({ 
                error: 'User not found',
                message: 'Please connect Discord first'
            });
        }
        
        // Check if Twitter is connected
        if (!user.twitter_provider_id) {
            return res.status(400).json({ 
                error: 'Twitter not connected',
                message: 'Please connect X/Twitter first'
            });
        }
        
        // Mark Twitter as followed
        const { error: updateError } = await supabase
            .from('users')
            .update({
                twitter_followed: true,
                twitter_followed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Twitter follow verified for user: ${user.id}`);
        
        res.json({ 
            success: true, 
            message: 'Twitter follow verified successfully'
        });
        
    } catch (error) {
        console.error('Error verifying Twitter follow:', error);
        res.status(500).json({ error: 'Failed to verify Twitter follow' });
    }
});

// NEW: Link Wallet to existing Discord session
app.post('/api/link-wallet-to-session', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    const { discordUserId, walletAddress } = req.body;
    
    if (!discordUserId || !walletAddress) {
        return res.status(400).json({ error: 'Discord user ID and wallet address are required' });
    }
    
    try {
        // 1. Check if wallet is already used in ANY account
        const { data: existingWallet } = await supabase
            .from('users')
            .select('id, discord_provider_id')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (existingWallet) {
            return res.status(400).json({ 
                error: 'This wallet address is already connected to another account',
                message: 'Please use a different wallet address'
            });
        }
        
        // 2. Find user by Discord ID
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('discord_provider_id', discordUserId)
            .single();
        
        if (findError || !user) {
            return res.status(404).json({ 
                error: 'Discord session not found',
                message: 'Please connect Discord first'
            });
        }
        
        // 3. Check if user has Twitter connected (required before wallet)
        if (!user.twitter_provider_id) {
            return res.status(400).json({ 
                error: 'X/Twitter not connected',
                message: 'Please connect X/Twitter before submitting wallet'
            });
        }
        
        // 4. Generate referral code if doesn't exist
        let referralCode = user.referral_code;
        if (!referralCode) {
            referralCode = user.id.replace(/-/g, '').substring(0, 8).toUpperCase();
            console.log(`🎯 Generated referral code: ${referralCode} for user: ${user.id}`);
        }
        
        // 5. Add wallet and referral code to the same UUID
        const { error: updateError } = await supabase
            .from('users')
            .update({
                wallet_address: walletAddress,
                wallet_connected_at: new Date().toISOString(),
                referral_code: referralCode,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Wallet linked to Discord session: ${user.id}`);
        console.log(`✅ Referral code set: ${referralCode}`);
        
        // 6. AUTO-COMPLETE REFERRAL: If user was referred, increment referrer's count
        if (user.referred_by) {
            console.log(`🎯 User was referred by: ${user.referred_by}, updating referrer count...`);
            
            // Get referrer's current count
            const { data: referrerData } = await supabase
                .from('users')
                .select('referral_completed_count, discord_username')
                .eq('referral_code', user.referred_by)
                .maybeSingle();
            
            if (referrerData) {
                const newCompletedCount = (referrerData.referral_completed_count || 0) + 1;
                
                // Increment referrer's completed count
                const { error: updateReferrerError } = await supabase
                    .from('users')
                    .update({ 
                        referral_completed_count: newCompletedCount
                    })
                    .eq('referral_code', user.referred_by);
                
                if (!updateReferrerError) {
                    console.log(`✅ Referral completed! Referrer ${user.referred_by} (${referrerData.discord_username}) now has ${newCompletedCount} completed referrals`);
                } else {
                    console.error('❌ Error updating referrer count:', updateReferrerError);
                }
            } else {
                console.log(`⚠️ Referrer not found for code: ${user.referred_by}`);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Wallet address saved successfully',
            userId: user.id,
            referralCode: referralCode
        });
        
    } catch (error) {
        console.error('Error linking wallet to session:', error);
        res.status(500).json({ error: 'Failed to save wallet address' });
    }
});

// NEW: Get session by Discord ID
app.get('/api/session/:discordUserId', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { discordUserId } = req.params;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('discord_provider_id', discordUserId)
            .single();
        
        if (error || !user) {
            return res.status(404).json({ 
                success: false,
                error: 'Session not found'
            });
        }
        
        // Determine task states
        const discordCompleted = !!user.discord_provider_id && !!user.discord_joined;
        const twitterConnected = !!user.twitter_provider_id;
        const twitterFollowed = !!user.twitter_followed; // Check if user verified follow
        const walletConnected = !!user.wallet_address;
        
        res.json({
            success: true,
            session: {
                id: user.id,
                discord_connected: !!user.discord_provider_id,
                discord_joined: !!user.discord_joined,
                twitter_connected: twitterConnected,
                twitter_followed: twitterFollowed,
                wallet_connected: walletConnected,
                tasks: {
                    discord: discordCompleted ? 'completed' : 'in_progress',
                    twitter: walletConnected ? 'completed' : (twitterFollowed ? 'unlocked' : (discordCompleted ? 'unlocked' : 'locked')),
                    wallet: walletConnected ? 'completed' : (twitterFollowed ? 'unlocked' : 'locked')
                }
            }
        });
        
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// OLD: Submit wallet address (DEPRECATED - use /api/link-wallet-to-session instead)
app.post('/api/submit-wallet', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    try {
        // Check if wallet address is already used
        const { data: existingWallet } = await supabase
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress)
            .single();
            
        if (existingWallet) {
            return res.status(400).json({ 
                error: 'Wallet address is already connected to another account' 
            });
        }
        
        // Try to find existing user by social connections
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .or(`twitter_provider_id.not.is.null,discord_provider_id.not.is.null`)
            .limit(1)
            .single();
        
        let userId;
        
        if (existingUser) {
            userId = existingUser.id;
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({})
                .select('id')
                .single();
                
            if (createError) throw createError;
            userId = newUser.id;
        }
        
        // Update wallet address
        const { error: updateError } = await supabase
            .from('users')
            .update({
                wallet_address: walletAddress,
                wallet_connected_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (updateError) throw updateError;
        
        res.json({ 
            success: true, 
            message: 'Wallet address saved successfully',
            userId: userId
        });
        
    } catch (error) {
        console.error('Error saving wallet address:', error);
        res.status(500).json({ error: 'Failed to save wallet address' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Debug endpoint to check state store
app.get('/api/debug/state-store', (req, res) => {
    res.json({
        size: stateStore.size,
        keys: Array.from(stateStore.keys()),
        states: Array.from(stateStore.entries()).map(([key, value]) => ({
            key,
            hasAccessToken: !!value.accessToken,
            hasUserId: !!value.userId,
            timestamp: value.timestamp
        }))
    });
});

// Debug endpoint to check database
app.get('/api/debug/database', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, twitter_provider_id, discord_provider_id, wallet_address, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({
            success: true,
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to simulate X OAuth callback
app.get('/api/debug/test-x-callback/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        console.log(`🧪 Testing X callback for user ID: ${userId}`);
        
        // Simulate the database check
        const { data: existingUser, error: queryError } = await supabase
            .from('users')
            .select('id, twitter_provider_id, discord_provider_id, wallet_address')
            .eq('twitter_provider_id', userId)
            .single();
        
        console.log(`🧪 Database query result:`, { existingUser, queryError });
        
        if (queryError && queryError.code !== 'PGRST116') {
            return res.status(500).json({ error: queryError.message });
        }
        
        if (existingUser) {
            if (existingUser.wallet_address) {
                return res.json({
                    action: 'BLOCK',
                    reason: 'Account already connected with wallet',
                    user: existingUser
                });
            } else {
                return res.json({
                    action: 'RESTORE',
                    reason: 'Account exists but no wallet - should restore session',
                    user: existingUser
                });
            }
        } else {
            return res.json({
                action: 'CREATE',
                reason: 'New account - should create new user',
                user: null
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to create a user manually
app.post('/api/debug/create-user', async (req, res) => {
    try {
        console.log('🧪 Creating test user manually...');
        
        const testUser = {
            twitter_provider_id: 'test_user_123',
            twitter_username: 'testuser',
            twitter_email: 'test@example.com',
            twitter_connected_at: new Date().toISOString(),
            twitter_social_address: 'social:twitter:test_user_123'
        };
        
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert(testUser)
            .select('id')
            .single();
        
        if (createError) {
            console.error('❌ Create error:', createError);
            return res.status(500).json({ error: createError.message });
        }
        
        console.log('✅ Test user created with ID:', newUser.id);
        res.json({
            success: true,
            user: newUser,
            message: 'Test user created successfully'
        });
    } catch (error) {
        console.error('❌ Error creating test user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to simulate X OAuth callback
app.get('/api/debug/test-x-oauth', async (req, res) => {
    console.log('🧪 Testing X OAuth callback simulation...');
    
    // Simulate a successful OAuth callback
    const mockUserId = 'test_twitter_user_' + Date.now();
    const mockUserData = {
        id: mockUserId,
        username: 'testuser',
        email: 'test@example.com'
    };
    
    // Actually create a user in the database
    if (supabase) {
        try {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    twitter_provider_id: mockUserId,
                    twitter_username: mockUserData.username,
                    twitter_email: mockUserData.email,
                    twitter_connected_at: new Date().toISOString(),
                    twitter_social_address: `social:twitter:${mockUserId}`
                })
                .select('id')
                .single();
            
            if (createError) {
                console.error('❌ Test user creation error:', createError);
            } else {
                console.log('✅ Test user created with ID:', newUser.id);
            }
        } catch (error) {
            console.error('❌ Test user creation failed:', error);
        }
    }
    
    res.send(`
        <html>
            <body>
                <script>
                    window.opener.postMessage({
                        type: 'X_AUTH_SUCCESS',
                        userId: '${mockUserId}',
                        state: 'test_state'
                    }, '${BASE_URL}');
                    window.close();
                </script>
                <p>Test OAuth callback - you can close this window.</p>
            </body>
        </html>
    `);
});

// Test endpoint to create a state for testing follow verification
app.get('/api/debug/create-test-state', async (req, res) => {
    console.log('🧪 Creating test state for follow verification...');
    
    const testState = 'test_state_' + Date.now();
    const testUserId = 'test_user_' + Date.now();
    const testAccessToken = 'test_access_token_' + Date.now();
    
    // Store test state
    stateStore.set(testState, {
        timestamp: Date.now(),
        codeVerifier: 'test_code_verifier',
        accessToken: testAccessToken,
        userId: testUserId
    });
    
    console.log(`✅ Test state created: ${testState}`);
    console.log(`📊 State store size: ${stateStore.size}`);
    
    res.json({
        success: true,
        state: testState,
        userId: testUserId,
        accessToken: testAccessToken,
        message: 'Test state created successfully'
    });
});

// Test endpoint to verify Discord bot configuration
app.get('/api/debug/test-discord-bot', async (req, res) => {
    console.log('🧪 Testing Discord bot configuration...');
    
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
        return res.status(400).json({
            success: false,
            error: 'Discord bot token or guild ID not configured',
            message: 'Please set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in your .env file'
        });
    }
    
    try {
        // Test bot access to guild
        const guildResponse = await axios.get(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}`, {
            headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Discord bot can access guild:', guildResponse.data.name);
        
        res.json({
            success: true,
            guild: {
                id: guildResponse.data.id,
                name: guildResponse.data.name,
                member_count: guildResponse.data.member_count
            },
            message: 'Discord bot is working correctly!'
        });
        
    } catch (error) {
        console.error('❌ Discord bot test failed:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Discord bot test failed',
            details: error.response?.data || error.message,
            message: 'Please check your Discord bot token and guild ID'
        });
    }
});

// ==================================================
// 🚀 ROBUST DISCORD VERIFICATION SYSTEM
// Enhanced with rate limiting, caching, and comprehensive error handling
// ==================================================

// Health monitoring for Discord verification
let discordHealthStats = {
    status: 'healthy',
    startTime: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    lastError: null,
    uptime: () => Math.floor((Date.now() - discordHealthStats.startTime) / 1000)
};

// Rate limiting storage for Discord verification
const discordRateLimitStore = new Map();
const discordCache = new Map();

// Discord verification configuration
const DISCORD_CONFIG = {
    RATE_LIMIT: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 45,     // Stay under Discord's 50/sec limit
        RETRY_AFTER: 5000     // 5 seconds
    },
    TIMEOUT: 15000,         // 15 seconds
    MAX_RETRIES: 3,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// Rate limiting middleware for Discord verification
function discordRateLimitMiddleware(req, res, next) {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean old entries
    for (const [key, data] of discordRateLimitStore.entries()) {
        if (now > data.resetTime) {
            discordRateLimitStore.delete(key);
        }
    }
    
    const clientData = discordRateLimitStore.get(clientId) || {
        count: 0,
        resetTime: now + DISCORD_CONFIG.RATE_LIMIT.WINDOW_MS
    };
    
    if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + DISCORD_CONFIG.RATE_LIMIT.WINDOW_MS;
    } else if (clientData.count >= DISCORD_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
        discordHealthStats.rateLimitHits++;
        console.log(`⚠️ Discord rate limit exceeded for ${clientId}`);
        return res.status(429).json({
            success: false,
            message: 'Too many Discord verification requests. Please try again later.',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
    } else {
        clientData.count++;
    }
    
    discordRateLimitStore.set(clientId, clientData);
    discordHealthStats.totalRequests++;
    next();
}

// Enhanced Discord API call with comprehensive error handling
async function callDiscordAPI(endpoint, retries = DISCORD_CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔗 Discord API call (attempt ${attempt}/${retries}): ${endpoint}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DISCORD_CONFIG.TIMEOUT);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'NEFTIT-Discord-Bot/1.0'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
                console.log(`⏳ Rate limited by Discord, waiting ${retryAfter}s...`);
                
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                } else {
                    return {
                        status: 429,
                        ok: false,
                        error: 'Rate limited by Discord API',
                        retryAfter
                    };
                }
            }
            
            // Handle other errors
            if (!response.ok && response.status !== 404) {
                console.log(`❌ Discord API error: ${response.status} ${response.statusText}`);
                
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
            }
            
            const data = response.ok ? await response.json() : null;
            
            return {
                status: response.status,
                ok: response.ok,
                data,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (error) {
            console.error(`💥 Discord API call error (attempt ${attempt}):`, error.message);
            
            if (error.name === 'AbortError') {
                console.log(`⏰ Request timeout after ${DISCORD_CONFIG.TIMEOUT}ms`);
            }
            
            if (attempt === retries) {
                return {
                    status: 500,
                    ok: false,
                    error: error.message,
                    type: error.name
                };
            }
            
            // Exponential backoff
            const delay = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Cache management for Discord verification
function getCachedDiscordResult(key) {
    const cached = discordCache.get(key);
    if (cached && Date.now() < cached.expires) {
        console.log(`📋 Using cached Discord result for: ${key}`);
        return cached.data;
    }
    if (cached) {
        discordCache.delete(key);
    }
    return null;
}

function setCachedDiscordResult(key, data) {
    discordCache.set(key, {
        data,
        expires: Date.now() + DISCORD_CONFIG.CACHE_DURATION
    });
    console.log(`💾 Cached Discord result for: ${key}`);
}

// API endpoint to verify Discord server join (ROBUST VERSION)
app.post('/api/verify-discord-join', discordRateLimitMiddleware, async (req, res) => {
    try {
        const { discordUserId, guildId } = req.body;
        
        if (!discordUserId) {
            discordHealthStats.failedRequests++;
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: discordUserId',
                error: 'MISSING_USER_ID'
            });
        }

        // Use guildId from request or fallback to environment variable
        const targetGuildId = guildId || DISCORD_GUILD_ID;
        
        if (!targetGuildId || targetGuildId === 'your_discord_guild_id_here') {
            discordHealthStats.failedRequests++;
            discordHealthStats.lastError = 'Discord guild ID not configured';
            return res.status(500).json({
                success: false,
                message: 'Discord guild ID not configured on server',
                error: 'MISSING_GUILD_ID',
                needsSetup: true
            });
        }

        // Validate Discord user ID format
        if (!/^\d{17,19}$/.test(discordUserId)) {
            discordHealthStats.failedRequests++;
            return res.status(400).json({
                success: false,
                message: 'Invalid Discord user ID format',
                error: 'INVALID_USER_ID'
            });
        }

        // Check if bot token is configured
        if (!DISCORD_BOT_TOKEN || DISCORD_BOT_TOKEN === 'your_discord_bot_token_here') {
            discordHealthStats.failedRequests++;
            discordHealthStats.lastError = 'Discord bot token not configured';
            return res.status(500).json({
                success: false,
                message: 'Discord bot token not configured on server',
                error: 'MISSING_BOT_TOKEN',
                needsSetup: true
            });
        }

        console.log(`🔍 Verifying Discord membership for user: ${discordUserId} in guild: ${targetGuildId}`);
        console.log(`🔍 Discord Bot Token configured: ${!!DISCORD_BOT_TOKEN}`);
        console.log(`🔍 Discord Guild ID: ${targetGuildId}`);

        // Check cache first
        const cacheKey = `member:${discordUserId}:${targetGuildId}`;
        const cached = getCachedDiscordResult(cacheKey);
        if (cached) {
            console.log(`📋 Using cached result for user ${discordUserId}`);
            discordHealthStats.successfulRequests++;
            return res.json({
                ...cached,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        const apiUrl = `https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUserId}`;
        console.log(`🔗 Making Discord API call to: ${apiUrl}`);
        const result = await callDiscordAPI(apiUrl);
        console.log(`📊 Discord API response status: ${result.status}, ok: ${result.ok}`);

        let response;
        if (result.status === 404) {
            console.log(`❌ User ${discordUserId} NOT found in Discord server ${targetGuildId}`);
            response = {
                success: false,
                message: 'User not found in Discord server. Please join the server first.',
                isMember: false,
                guildId: targetGuildId,
                userId: discordUserId
            };
            discordHealthStats.failedRequests++;
        } else if (!result.ok) {
            response = {
                success: false,
                message: 'Failed to verify Discord membership',
                error: result.error || `Discord API returned status: ${result.status}`,
                isMember: false,
                guildId: targetGuildId,
                userId: discordUserId
            };
            discordHealthStats.failedRequests++;
            discordHealthStats.lastError = result.error;
        } else {
            console.log(`✅ User ${discordUserId} FOUND in Discord server ${targetGuildId}`);
            console.log(`👤 Username: ${result.data.user?.username}`);
            console.log(`📅 Joined at: ${result.data.joined_at}`);
            console.log(`🎭 Roles: ${JSON.stringify(result.data.roles || [])}`);
            console.log(`⏳ Pending status: ${result.data.pending}`);
            
            // Check if user is pending verification
            if (result.data.pending === true) {
                console.log(`⚠️ User is PENDING verification - not fully joined yet`);
                response = {
                    success: false,
                    message: 'Please join the discord and try again!',
                    isMember: false,
                    guildId: targetGuildId,
                    userId: discordUserId,
                    pending: true,
                    memberData: {
                        username: result.data.user?.username,
                        discriminator: result.data.user?.discriminator,
                        joinedAt: result.data.joined_at,
                        roles: result.data.roles || []
                    }
                };
                discordHealthStats.failedRequests++;
            } else {
                console.log(`✅ User is FULLY VERIFIED - joined successfully`);
                response = {
                    success: true,
                    message: 'Discord membership verified successfully!',
                    isMember: true,
                    guildId: targetGuildId,
                    userId: discordUserId,
                    memberData: {
                        username: result.data.user?.username,
                        discriminator: result.data.user?.discriminator,
                        joinedAt: result.data.joined_at,
                        roles: result.data.roles || []
                    }
                };
                discordHealthStats.successfulRequests++;
                setCachedDiscordResult(cacheKey, response);
            }
        }

        // Update database with join status if successful
        if (response.success && response.isMember && supabase) {
            try {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                        discord_joined: true,
                        discord_joined_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('discord_provider_id', discordUserId);
                
                if (updateError) {
                    console.error('❌ Error updating Discord join status:', updateError);
                } else {
                    console.log('✅ Discord join status updated in database');
                }
            } catch (dbError) {
                console.error('❌ Database error:', dbError);
            }
        }

        res.json({
            ...response,
            timestamp: new Date().toISOString(),
            cached: false
        });

    } catch (error) {
        discordHealthStats.failedRequests++;
        discordHealthStats.lastError = error.message;
        console.error('❌ Discord membership verification error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Internal error during Discord membership verification',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Discord verification health check endpoint
app.get('/api/discord-health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    
    res.json({
        success: true,
        message: 'Discord verification service is running',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(discordHealthStats.uptime() / 3600)}h ${Math.floor((discordHealthStats.uptime() % 3600) / 60)}m ${discordHealthStats.uptime() % 60}s`,
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        stats: discordHealthStats,
        config: {
            botTokenConfigured: !!DISCORD_BOT_TOKEN,
            guildIdConfigured: !!DISCORD_GUILD_ID,
            rateLimit: DISCORD_CONFIG.RATE_LIMIT,
            cacheSize: discordCache.size,
            rateLimitStoreSize: discordRateLimitStore.size
        }
    });
});

// Clear Discord verification cache endpoint
app.post('/api/discord-clear-cache', (req, res) => {
    const oldSize = discordCache.size;
    discordCache.clear();
    discordRateLimitStore.clear();
    
    res.json({
        success: true,
        message: 'Discord verification cache cleared successfully',
        clearedEntries: oldSize,
        timestamp: new Date().toISOString()
    });
});

// Clean up expired states and Discord cache (run every minute)
setInterval(() => {
    const now = Date.now();
    
    // Clean up OAuth states
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > 3600000) { // 1 hour
            stateStore.delete(state);
        }
    }
    
    // Clean up Discord cache
    for (const [key, data] of discordCache.entries()) {
        if (now >= data.expires) {
            discordCache.delete(key);
        }
    }
    
    // Clean up Discord rate limit store
    for (const [key, data] of discordRateLimitStore.entries()) {
        if (now > data.resetTime) {
            discordRateLimitStore.delete(key);
        }
    }
    
    // Reset Discord health status if no recent errors
    if (discordHealthStats.status === 'degraded' && now - discordHealthStats.startTime > 300000) { // 5 minutes
        discordHealthStats.status = 'healthy';
    }
}, 60000); // Run every minute

// Serve static files (frontend) - must be after auth routes
app.use(express.static('.'));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// ============================================
// REFERRAL SYSTEM ENDPOINTS
// ============================================

// Get user's referral info
app.get('/api/referral/:discordUserId', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { discordUserId } = req.params;
        
        console.log('🔍 Fetching referral info for Discord ID:', discordUserId);
        
        // Get user with referral data
        const { data: user, error } = await supabase
            .from('users')
            .select('id, referral_code, referral_completed_count, wallet_address, discord_joined, twitter_provider_id')
            .eq('discord_provider_id', discordUserId)
            .maybeSingle();
        
        console.log('📊 Database query result:', { user, error });
        
        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database query failed', details: error.message });
        }
        
        if (!user) {
            console.log('❌ User not found in database for Discord ID:', discordUserId);
            return res.status(404).json({ error: 'User not found', discordUserId });
        }
        
        // Check if user has completed ALL tasks (Discord joined, Twitter connected, Wallet submitted)
        const hasCompletedAllTasks = !!user.discord_joined && !!user.twitter_provider_id && !!user.wallet_address;
        
        console.log('🔍 Referral check for user:', discordUserId);
        console.log('📊 Task status:', {
            discord_joined: !!user.discord_joined,
            twitter_provider_id: !!user.twitter_provider_id,
            wallet_address: !!user.wallet_address,
            hasCompletedAllTasks
        });
        
        // Generate referral code if doesn't exist
        let referralCode = user.referral_code;
        if (!referralCode && hasCompletedAllTasks) {
            // Generate code from user ID
            referralCode = user.id.replace(/-/g, '').substring(0, 8).toUpperCase();
            
            // Update user with referral code
            const { error: updateError } = await supabase
                .from('users')
                .update({ referral_code: referralCode })
                .eq('id', user.id);
            
            if (updateError) {
                console.error('Error updating referral code:', updateError);
            }
        }
        
        res.json({
            success: true,
            referralCode: hasCompletedAllTasks ? referralCode : null,
            referralCount: user.referral_completed_count || 0,
            hasCompletedAllTasks,
            referralLink: hasCompletedAllTasks ? `${BASE_URL}?ref=${referralCode}` : null
        });
        
    } catch (error) {
        console.error('Error getting referral info:', error);
        res.status(500).json({ error: 'Failed to get referral info' });
    }
});

// Apply referral code when user signs up
app.post('/api/apply-referral', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { discordUserId, referralCode } = req.body;
        
        console.log(`🔍 Apply referral request:`, { discordUserId, referralCode });
        
        if (!discordUserId || !referralCode) {
            return res.status(400).json({ error: 'Discord user ID and referral code required' });
        }
        
        // Check if referral code exists
        const { data: referrer, error: referrerError } = await supabase
            .from('users')
            .select('id, referral_code, discord_username')
            .eq('referral_code', referralCode.toUpperCase())
            .maybeSingle();
        
        console.log(`📊 Referrer query:`, { referrer, referrerError });
        
        if (referrerError || !referrer) {
            console.log('❌ Invalid referral code:', referralCode);
            return res.status(404).json({ error: 'Invalid referral code' });
        }
        
        console.log(`✅ Found referrer: ${referrer.discord_username} (${referrer.referral_code})`);
        
        // Get the user being referred
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, referred_by, discord_provider_id, discord_username')
            .eq('discord_provider_id', discordUserId)
            .maybeSingle();
        
        console.log(`📊 User being referred query:`, { user, userError });
        
        if (userError) {
            console.error('❌ Database error finding user:', userError);
            return res.status(500).json({ error: 'Database error', details: userError.message });
        }
        
        if (!user) {
            console.log('❌ User not found for Discord ID:', discordUserId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`📋 User being referred: ${user.discord_username}, already has referrer: ${user.referred_by || 'none'}`);
        
        // Check if user already has a referrer
        if (user.referred_by) {
            console.log(`⚠️ User already referred by: ${user.referred_by}`);
            return res.status(400).json({ error: 'User already has a referrer' });
        }
        
        // Check if user is trying to refer themselves
        if (referrer.id === user.id) {
            console.log('❌ User trying to refer themselves');
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }
        
        // Apply referral code
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                referred_by: referralCode.toUpperCase()
            })
            .eq('id', user.id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Increment referrer's total referral count
        const { data: referrerData, error: fetchError } = await supabase
            .from('users')
            .select('referral_count')
            .eq('id', referrer.id)
            .maybeSingle();
        
        if (fetchError) {
            console.error('❌ Error fetching referrer data:', fetchError);
        }
        
        const newCount = (referrerData?.referral_count || 0) + 1;
        
        console.log(`📊 Updating referrer count from ${referrerData?.referral_count || 0} to ${newCount}`);
        
        const { error: countError } = await supabase
            .from('users')
            .update({ 
                referral_count: newCount
            })
            .eq('id', referrer.id);
        
        if (countError) {
            console.error('❌ Error updating referral count:', countError);
        } else {
            console.log(`✅ Referrer count updated to ${newCount}`);
        }
        
        console.log(`✅ Referral applied: ${user.discord_provider_id} referred by ${referralCode}`);
        
        res.json({ 
            success: true, 
            message: 'Referral code applied successfully'
        });
        
    } catch (error) {
        console.error('❌ Error applying referral:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to apply referral code',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update referral count when user completes all tasks
app.post('/api/complete-referral', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { discordUserId } = req.body;
        
        console.log(`🔍 Complete referral request for Discord ID: ${discordUserId}`);
        
        // Get user with referral data
        const { data: user, error } = await supabase
            .from('users')
            .select('id, referred_by, wallet_address, discord_username')
            .eq('discord_provider_id', discordUserId)
            .maybeSingle();
        
        console.log(`📊 User query result:`, { user, error });
        
        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }
        
        if (!user) {
            console.log('❌ User not found for Discord ID:', discordUserId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`📋 User data:`, {
            username: user.discord_username,
            has_wallet: !!user.wallet_address,
            referred_by: user.referred_by
        });
        
        // Check if user completed all tasks and was referred
        if (user.wallet_address && user.referred_by) {
            console.log(`🎯 User ${discordUserId} completed all tasks, updating referrer: ${user.referred_by}`);
            
            // Get referrer's current count
            const { data: referrerData } = await supabase
                .from('users')
                .select('referral_completed_count')
                .eq('referral_code', user.referred_by)
                .single();
            
            const newCompletedCount = (referrerData?.referral_completed_count || 0) + 1;
            
            // Increment referrer's completed count
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    referral_completed_count: newCompletedCount
                })
                .eq('referral_code', user.referred_by);
            
            if (updateError) {
                console.error('❌ Error updating referral completed count:', updateError);
                return res.status(500).json({ error: 'Failed to update referral count' });
            }
            
            console.log(`✅ Referral completed! Referrer ${user.referred_by} now has ${newCompletedCount} completed referrals`);
            
            res.json({ 
                success: true, 
                message: 'Referral completed',
                newCount: newCompletedCount
            });
        } else {
            console.log(`ℹ️ User ${discordUserId} not referred or tasks not completed`);
            res.json({ 
                success: false, 
                message: 'User not referred or tasks not completed'
            });
        }
        
    } catch (error) {
        console.error('Error completing referral:', error);
        res.status(500).json({ error: 'Failed to complete referral' });
    }
});

app.listen(PORT, () => {
    console.log(`OAuth server running on port ${PORT}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`X OAuth: ${BASE_URL}/auth/x`);
    console.log(`Discord OAuth: ${BASE_URL}/auth/discord`);
});
