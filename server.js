const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

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
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || 'http://localhost:3000/auth/x/callback';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_INVITE_LINK = process.env.DISCORD_INVITE_LINK || 'https://discord.com/invite/Xc54PrHv7w';
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

// Store for state verification
const stateStore = new Map();

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
    
    // Show a loading page with instructions
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Connecting to X...</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #000;
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    max-width: 400px;
                    padding: 20px;
                }
                .spinner {
                    border: 3px solid #333;
                    border-top: 3px solid #1da1f2;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .message {
                    margin: 20px 0;
                    line-height: 1.5;
                }
                .redirect-btn {
                    background: #1da1f2;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                }
                .redirect-btn:hover {
                    background: #0d8bd9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Connecting to X (Twitter)</h2>
                <div class="spinner"></div>
                <div class="message">
                    <p>You'll be redirected to X to authorize our app.</p>
                    <p>If you're already logged into X, you'll just need to click "Authorize" to allow us to follow Neftit on your behalf.</p>
                </div>
                <button class="redirect-btn" onclick="window.location.href='${authUrl}'">
                    Continue to X Authorization
                </button>
            </div>
        </body>
        </html>
    `);
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
                        }, 'http://localhost:3000');
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
                        }, 'http://localhost:3000');
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
                        }, 'http://localhost:3000');
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
        
        // Skip user info call to avoid rate limits - create user directly
        console.log('🔵 Skipping user info call to avoid rate limits');
        
        const userId = 'twitter_user_' + Date.now();
        const userData = {
            id: userId,
            username: 'twitter_user',
            email: null
        };
        
        console.log('🔵 Using direct user creation:', userData);
        
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
                                        }, 'http://localhost:3000');
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
                                        }, 'http://localhost:3000');
                                        window.close();
                                    </script>
                                    <p>Session restored! You can close this window.</p>
                                </body>
                            </html>
                        `);
                    }
                } else {
                    // New connection - proceed normally
                    console.log('🔵 New Twitter connection - creating new user');
                    console.log('🔵 User data to insert:', {
                        twitter_provider_id: userId,
                        twitter_username: userData.username,
                        twitter_email: userData.email || null,
                        twitter_connected_at: new Date().toISOString(),
                        twitter_social_address: socialAddress
                    });
                    
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            twitter_provider_id: userId,
                            twitter_username: userData.username,
                            twitter_email: userData.email || null,
                            twitter_connected_at: new Date().toISOString(),
                            twitter_social_address: socialAddress
                        })
                        .select('id')
                        .single();
                    
                    if (createError) {
                        console.error('🔵 Create user error:', createError);
                        throw createError;
                    }
                    
                    console.log('🔵 New user created with ID:', newUser.id);
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
                                }, 'http://localhost:3000');
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
                            }, 'http://localhost:3000');
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
                        }, 'http://localhost:3000');
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
                        }, 'http://localhost:3000');
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
                    
                    // Check if wallet is submitted
                    if (existingUser.wallet_address) {
                        // Account is locked - wallet submitted
                        console.log('❌ Account locked - wallet already submitted');
                        return res.send(`
                            <html>
                                <body style="font-family: Arial; background: #000; color: #fff; padding: 20px;">
                                    <h2>Account Already Connected</h2>
                                    <p>This Discord account has already submitted a wallet address and cannot be used again.</p>
                                    <script>
                                        window.opener.postMessage({
                                            type: 'DISCORD_AUTH_ERROR',
                                            error: 'Account already connected with wallet'
                                        }, 'http://localhost:3000');
                                        window.close();
                                    </script>
                                </body>
                            </html>
                        `);
                    } else {
                        // Account exists but no wallet - restore session
                        console.log('✅ Restoring Discord session - no wallet submitted yet');
                        
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
                        
                        // Send success with existing user ID
                        return res.send(`
                            <html>
                                <body>
                                    <script>
                                        window.opener.postMessage({
                                            type: 'DISCORD_AUTH_SUCCESS',
                                            userId: '${userId}',
                                            restored: true
                                        }, 'http://localhost:3000');
                                        window.close();
                                    </script>
                                    <p>Session restored! You can close this window.</p>
                                </body>
                            </html>
                        `);
                    }
                } else {
                    // New connection - create new user with Discord
                    console.log('✅ New Discord connection - creating new user');
                    
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
                                }, 'http://localhost:3000');
                                window.close();
                            </script>
                        </body>
                    </html>
                `);
            }
        } else {
            console.log('⚠️ Supabase not available - user data not saved to database');
        }
        
        // Clean up state
        stateStore.delete(state);
        
        // Send success message to parent window
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_SUCCESS',
                            userId: '${userId}'
                        }, 'http://localhost:3000');
                        window.close();
                    </script>
                    <p>Authentication successful! You can close this window.</p>
                </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Discord OAuth error:', error.response?.data || error.message);
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_ERROR',
                            error: 'Authentication failed'
                        }, 'http://localhost:3000');
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
        neftitUsername: NEFTIT_X_USERNAME
    });
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
app.post('/api/verify-follow', async (req, res) => {
    console.log('🔍 Verify follow request received');
    console.log('Request body:', req.body);
    console.log('State store size:', stateStore.size);
    console.log('State store keys:', Array.from(stateStore.keys()));
    
    const { state } = req.body;
    
    if (!state) {
        console.log('❌ No state provided in request');
        return res.status(400).json({ error: 'No state parameter provided' });
    }
    
    if (!stateStore.has(state)) {
        console.log('❌ State not found in store:', state);
        return res.status(400).json({ error: 'Invalid state parameter - state not found' });
    }
    
    const stateData = stateStore.get(state);
    console.log('📊 State data:', stateData);
    
    if (!stateData.accessToken || !stateData.userId) {
        console.log('❌ Missing access token or user ID in state data');
        return res.status(400).json({ error: 'No access token or user ID available' });
    }
    
    try {
        console.log('🔍 Checking if user follows @neftitxyz...');
        console.log('User ID:', stateData.userId);
        
        // Get Neftit's user ID (with caching)
        let neftitUserId;
        try {
            neftitUserId = await getNeftitUserId(stateData.accessToken);
        } catch (neftitError) {
            console.error('❌ Error getting Neftit user ID:', neftitError.response?.data || neftitError.message);
            if (neftitError.response?.status === 429) {
                return res.status(429).json({ 
                    error: 'Rate limited by Twitter API',
                    message: 'Please try again in a few minutes. Twitter API has rate limits.',
                    retryAfter: neftitError.response.headers['x-rate-limit-reset'] || 900
                });
            }
            throw neftitError;
        }
        
        // Check if user follows Neftit using Twitter API v1.1 friendships/show endpoint
        let isFollowing = false;
        
        try {
            console.log('🔍 Checking if user follows @neftitxyz using friendships/show...');
            
            // Use Twitter API v1.1 friendships/show endpoint
            // source_screen_name = user we're checking, target_screen_name = neftitxyz
            const friendshipResponse = await axios.get('https://api.twitter.com/1.1/friendships/show.json', {
            headers: {
                'Authorization': `Bearer ${stateData.accessToken}`
                },
                params: {
                    'source_screen_name': stateData.userId,  // The user we're checking
                    'target_screen_name': 'neftitxyz'        // Our account
                }
            });
            
            console.log('📊 Friendship response:', friendshipResponse.data);
            
            // Check if the source user is following the target user (neftitxyz)
            const relationship = friendshipResponse.data.relationship;
            if (relationship && relationship.source) {
                isFollowing = relationship.source.following === true;
                console.log(`🎯 User ${isFollowing ? 'IS' : 'IS NOT'} following @neftitxyz`);
            } else {
                console.log('❌ No relationship data found');
                isFollowing = false;
            }
            
        } catch (friendshipError) {
            console.log('❌ Error checking friendship:', friendshipError.response?.data || friendshipError.message);
            
            if (friendshipError.response?.status === 404) {
                // 404 means user doesn't follow Neftit
                isFollowing = false;
                console.log('❌ User does not follow Neftit (404)');
            } else if (friendshipError.response?.status === 429) {
                return res.status(429).json({ 
                    error: 'Rate limited by Twitter API',
                    message: 'Please try again in a few minutes. Twitter API has rate limits.',
                    retryAfter: friendshipError.response.headers['x-rate-limit-reset'] || 900
                });
            } else if (friendshipError.response?.status === 403) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'Please re-connect to X to grant follow reading permissions. Click "Connect X" again.',
                    needsReauth: true
                });
            } else {
                // For other errors, try to get the user's username first
                console.log('🔄 Trying to get user info first...');
                try {
                    const userInfoResponse = await axios.get('https://api.twitter.com/2/users/me', {
                        headers: {
                            'Authorization': `Bearer ${stateData.accessToken}`
                        }
                    });
                    
                    const username = userInfoResponse.data.data.username;
                    console.log(`👤 Got username: ${username}`);
                    
                    // Now try friendships/show with the username
                    const friendshipResponse2 = await axios.get('https://api.twitter.com/1.1/friendships/show.json', {
            headers: {
                'Authorization': `Bearer ${stateData.accessToken}`
            },
            params: {
                            'source_screen_name': username,  // The user we're checking
                            'target_screen_name': 'neftitxyz'  // Our account
                        }
                    });
                    
                    const relationship = friendshipResponse2.data.relationship;
                    if (relationship && relationship.source) {
                        isFollowing = relationship.source.following === true;
                        console.log(`🎯 User ${isFollowing ? 'IS' : 'IS NOT'} following @neftitxyz (retry)`);
                    } else {
                        isFollowing = false;
                    }
                    
                } catch (retryError) {
                    console.error('❌ Error in retry attempt:', retryError.response?.data || retryError.message);
                    throw retryError;
                }
            }
        }
        
        console.log(`🎯 Final result: User ${isFollowing ? 'IS' : 'IS NOT'} following @neftitxyz`);
        
        // Update database with follow status
            if (supabase) {
                try {
                const { error: updateError } = await supabase
                        .from('users')
                        .update({
                        followed_neftit: isFollowing,
                            updated_at: new Date().toISOString()
                        })
                        .eq('twitter_provider_id', stateData.userId);
                    
                if (updateError) {
                    console.error('❌ Database update error:', updateError);
                } else {
                    console.log('✅ Database updated with follow status');
                }
                } catch (dbError) {
                console.error('❌ Database error:', dbError);
                }
            }
            
        // Clean up state after verification
            stateStore.delete(state);
            
        if (isFollowing) {
            res.json({ 
                success: true, 
                followed: true,
                message: 'Successfully verified follow! You are following @neftitxyz'
            });
        } else {
            res.json({ 
                success: true, 
                followed: false,
                message: `Please follow @${NEFTIT_X_USERNAME} first, then click Verify Follow again`,
                manualVerification: true
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking follow status:', error);
        res.status(500).json({ 
            error: 'Failed to verify follow status',
            details: error.response?.data || error.message
        });
    }
});

// Direct follow verification (when we have Twitter user ID but no OAuth state)
app.post('/api/direct-verify-follow', async (req, res) => {
    const { twitterUserId, confirmed } = req.body;
    
    if (!twitterUserId) {
        return res.status(400).json({ error: 'Twitter user ID required' });
    }
    
    if (!confirmed) {
        return res.status(400).json({ error: 'Confirmation required' });
    }
    
    try {
        // Update database to mark as followed
        if (supabase) {
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    followed_neftit: true,
                    updated_at: new Date().toISOString()
                })
                .eq('twitter_provider_id', twitterUserId);
                
            if (updateError) {
                console.error('❌ Database update error:', updateError);
                return res.status(500).json({ error: 'Failed to update follow status' });
            }
        }
        
        res.json({ 
            success: true, 
            followed: true,
            message: 'Follow verified directly!'
        });
        
    } catch (error) {
        console.error('❌ Error in direct verification:', error);
        res.status(500).json({ error: 'Failed to verify follow directly' });
    }
});

// Manual follow verification (when API fails)
app.post('/api/manual-verify-follow', async (req, res) => {
    const { state, confirmed } = req.body;
    
    if (!state || !stateStore.has(state)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    const stateData = stateStore.get(state);
    if (!stateData.userId) {
        return res.status(400).json({ error: 'No user ID available' });
    }
    
    if (!confirmed) {
        return res.status(400).json({ error: 'Confirmation required' });
    }
    
    try {
        // Update database to mark as followed
        if (supabase) {
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    followed_neftit: true,
                    updated_at: new Date().toISOString()
                })
                .eq('twitter_provider_id', stateData.userId);
                
            if (updateError) {
                console.error('❌ Database update error:', updateError);
                return res.status(500).json({ error: 'Failed to update follow status' });
            }
        }
        
        // Clean up state
        stateStore.delete(state);
        
        res.json({ 
            success: true, 
            followed: true,
            message: 'Follow verified manually!'
        });
        
    } catch (error) {
        console.error('❌ Error in manual verification:', error);
        res.status(500).json({ error: 'Failed to verify follow manually' });
    }
});

// Submit wallet address
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
                    }, 'http://localhost:3000');
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

// API endpoint to verify Discord server join
app.post('/api/verify-discord-join', async (req, res) => {
    console.log('🔍 Verify Discord join request received');
    console.log('Request body:', req.body);
    
    const { discordUserId } = req.body;
    
    if (!discordUserId) {
        console.log('❌ No Discord user ID provided');
        return res.status(400).json({ error: 'No Discord user ID provided' });
    }
    
    try {
        console.log('🔍 Verifying Discord server join for user:', discordUserId);
        
        // Check if bot token and guild ID are configured
        if (!DISCORD_BOT_TOKEN || DISCORD_BOT_TOKEN === 'your_discord_bot_token_here') {
            console.log('❌ Discord bot token not configured');
            return res.status(500).json({ 
                error: 'Bot not configured',
                message: 'Discord bot token is not configured. Please set DISCORD_BOT_TOKEN in your .env file.',
                needsSetup: true
            });
        }
        
        if (!DISCORD_GUILD_ID || DISCORD_GUILD_ID === 'your_discord_guild_id_here') {
            console.log('❌ Discord guild ID not configured');
            return res.status(500).json({ 
                error: 'Guild not configured',
                message: 'Discord guild ID is not configured. Please set DISCORD_GUILD_ID in your .env file.',
                needsSetup: true
            });
        }
        
        // Use Discord Bot API to check if user is in your server
        console.log('🔍 Checking if user is in Discord server using bot API...');
        console.log('🔍 Guild ID:', DISCORD_GUILD_ID);
        console.log('🔍 Bot token configured:', DISCORD_BOT_TOKEN ? 'YES' : 'NO');
        
        let isInServer = false;
        
        try {
            // Get user from Discord server using bot token
            const memberResponse = await axios.get(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
                headers: {
                    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (memberResponse.status === 200) {
                isInServer = true;
                console.log('✅ User found in Discord server:', memberResponse.data.user.username);
            }
            
        } catch (discordError) {
            console.log('❌ Error checking Discord server membership:', discordError.response?.status, discordError.response?.data);
            
            if (discordError.response?.status === 404) {
                // 404 means user is not in the server
                isInServer = false;
                console.log('❌ User not found in Discord server');
            } else if (discordError.response?.status === 403) {
                console.log('❌ Bot does not have permission to check server members');
                return res.status(500).json({ 
                    error: 'Bot permission error',
                    message: 'Bot does not have permission to check server members. Please add the bot to your server and give it proper permissions.',
                    needsSetup: true
                });
            } else if (discordError.response?.status === 10004) {
                console.log('❌ Unknown Guild - Bot not in server or invalid guild ID');
                return res.status(500).json({ 
                    error: 'Unknown Guild',
                    message: 'Bot is not in the Discord server or guild ID is incorrect. Please add the bot to your server.',
                    needsSetup: true
                });
            } else {
                console.log('❌ Discord API error:', discordError.message);
                return res.status(500).json({ 
                    error: 'Discord API error',
                    message: 'Failed to check Discord server membership. Please try again.',
                    details: discordError.response?.data
                });
            }
        }
        
        if (isInServer) {
            console.log('✅ User is verified to be in Discord server');
            
            // Update database with join status
            if (supabase) {
                try {
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ 
                            discord_joined: true,
                            discord_joined_at: new Date().toISOString()
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
                success: true,
                joined: true,
                message: 'Discord server join verified successfully!'
            });
            
        } else {
            console.log('❌ User is not in Discord server');
            res.json({
                success: false,
                joined: false,
                message: 'Please join the Discord server first, then try again.'
            });
        }
        
    } catch (error) {
        console.error('❌ Error verifying Discord join:', error);
        res.status(500).json({ 
            error: 'Failed to verify Discord join',
            details: error.message 
        });
    }
});

// Clean up expired states (run every hour)
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > 3600000) { // 1 hour
            stateStore.delete(state);
        }
    }
}, 3600000);

// Serve static files (frontend) - must be after auth routes
app.use(express.static('.'));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
    console.log(`OAuth server running on port ${PORT}`);
    console.log(`X OAuth: http://localhost:${PORT}/auth/x`);
    console.log(`Discord OAuth: http://localhost:${PORT}/auth/discord`);
});
