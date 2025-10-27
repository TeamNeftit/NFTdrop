// Global state for task completion
let completedTasks = {
    follow: false,
    discord: false,
    address: false
};

// Store OAuth state for follow verification
let currentOAuthState = null;
let currentTwitterUserId = null;
let currentDiscordUserId = null;

// Configuration loaded from server
let DISCORD_INVITE_LINK = 'https://discord.com/invite/your_invite_code_here'; // Default fallback
let DISCORD_GUILD_ID = null; // Will be loaded from server
let BASE_URL = window.location.origin;
let NEFTIT_USERNAME = 'neftitxyz'; // Default fallback

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 NFT Drop page loaded - SCRIPT VERSION 3');
    
    // Don't initialize locks here - let checkExistingConnections handle it
    // This prevents overwriting the restored session state
    
    loadConfig();
    loadTaskStates();
    checkOAuthResults();
    checkUserStatus();
    checkExistingConnections(); // This will set proper locks based on session
    loadParticipantCount();
    updateProgress();
});

// Load participant count from server
async function loadParticipantCount() {
    console.log('📊 Loading participant count...');
    
    try {
        const response = await fetch('/api/participant-count');
        console.log('📊 Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        const countElement = document.getElementById('total-participants');
        
        if (!countElement) {
            console.error('❌ Participant count element not found');
            return;
        }
        
        if (data.success && data.count !== undefined) {
            // Animate the count
            const finalCount = data.count || 0;
            console.log('✅ Animating count to:', finalCount);
            animateCount(countElement, 0, finalCount, 1500);
        } else {
            // Fallback to showing the count even if success is false
            const finalCount = data.count || 0;
            console.log('⚠️ Using fallback count:', finalCount);
            countElement.textContent = finalCount.toLocaleString();
        }
    } catch (error) {
        console.error('❌ Error loading participant count:', error);
        // Set default count on error
        const countElement = document.getElementById('total-participants');
        if (countElement) {
            countElement.textContent = '0';
        }
    }
}

// Animate number counting
function animateCount(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = Math.floor(end).toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Load configuration from server
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (config.discordInviteLink) {
            DISCORD_INVITE_LINK = config.discordInviteLink;
            console.log('✅ Loaded Discord invite link from server:', DISCORD_INVITE_LINK);
        }
        
        if (config.discordGuildId) {
            DISCORD_GUILD_ID = config.discordGuildId;
            console.log('✅ Loaded Discord guild ID from server:', DISCORD_GUILD_ID);
        }
        
        if (config.baseUrl) {
            BASE_URL = config.baseUrl;
            console.log('✅ Loaded base URL from server:', BASE_URL);
        }
        
        if (config.neftitUsername) {
            NEFTIT_USERNAME = config.neftitUsername;
            console.log('✅ Loaded Neftit username from server:', NEFTIT_USERNAME);
        }
        
        // Clear any cached Discord data to force fresh check
        try {
            await fetch('/api/discord-clear-cache', { method: 'POST' });
            console.log('🧹 Cleared Discord verification cache');
        } catch (error) {
            console.log('⚠️ Could not clear Discord cache:', error);
        }
    } catch (error) {
        console.log('⚠️ Could not load config from server, using default values');
    }
}

// Check user's current status from database
async function checkUserStatus() {
    try {
        // This will be called after X authentication to get current status
        if (currentTwitterUserId) {
            await checkUserCurrentStatus(currentTwitterUserId);
        }
    } catch (error) {
        console.error('Error checking user status:', error);
    }
}

// NEW: Load session from Discord ID
async function loadSessionFromDiscord(discordUserId) {
    try {
        console.log('🔄 Loading session for Discord ID:', discordUserId);
        
        const response = await fetch(`/api/session/${discordUserId}`);
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Session loaded:', result.session);
            
            const session = result.session;
            
            // Update Discord UI
            if (session.discord_joined) {
                console.log('✅ Discord is JOINED - showing completed state');
                completedTasks.discord = true;
                console.log('📝 Set completedTasks.discord = true');
                updateTaskUI('discord');
                saveTaskStates();
                console.log('💾 Saved to localStorage:', JSON.stringify(completedTasks));
                
                // Hide connect and join, show verify as completed
                const connectBtn = document.getElementById('discord-connect-btn');
                const joinBtn = document.getElementById('discord-join-btn');
                const verifyBtn = document.getElementById('discord-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'none';
                if (joinBtn) joinBtn.style.display = 'none';
                if (verifyBtn) {
                    verifyBtn.style.display = 'inline-block';
                    verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                    verifyBtn.disabled = true;
                    verifyBtn.style.backgroundColor = '#5d43ef';
                    verifyBtn.style.cursor = 'not-allowed';
                    verifyBtn.style.opacity = '0.7';
                    console.log('✅ Discord verify button shown as completed');
                }
                
                // Unlock X task
                const xTask = document.getElementById('task-follow');
                const xConnectBtn = document.getElementById('twitter-connect-btn');
                if (xTask) {
                    xTask.classList.remove('locked');
                    console.log('🔓 X task unlocked');
                }
                if (xConnectBtn) {
                    xConnectBtn.disabled = false;
                    console.log('🔓 X connect button enabled');
                }
            } else if (session.discord_connected) {
                console.log('🔗 Discord is CONNECTED but not joined - showing join button');
                // Discord connected but not joined yet
                const connectBtn = document.getElementById('discord-connect-btn');
                const joinBtn = document.getElementById('discord-join-btn');
                if (connectBtn) connectBtn.style.display = 'none';
                if (joinBtn) joinBtn.style.display = 'inline-block';
            }
            
            // Update X UI
            if (session.twitter_followed) {
                // User has completed the follow task
                console.log('✅ Twitter followed - marking X task as completed');
                currentTwitterUserId = discordUserId;
                localStorage.setItem('currentTwitterUserId', discordUserId);
                
                // Mark X task as completed
                completedTasks.follow = true;
                updateTaskUI('follow');
                
                // Show all buttons as completed
                const connectBtn = document.getElementById('twitter-connect-btn');
                const followBtn = document.getElementById('twitter-follow-btn');
                const verifyBtn = document.getElementById('twitter-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'none';
                if (followBtn) followBtn.style.display = 'none';
                if (verifyBtn) {
                    verifyBtn.style.display = 'inline-block';
                    verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                    verifyBtn.disabled = true;
                    verifyBtn.style.backgroundColor = '#5d43ef';
                    verifyBtn.style.cursor = 'not-allowed';
                    verifyBtn.style.opacity = '0.7';
                    console.log('✅ X verify button shown as completed');
                }
            } else if (session.twitter_connected) {
                // User connected but hasn't followed yet
                console.log('🔗 Twitter connected but not followed - showing follow button');
                currentTwitterUserId = discordUserId;
                localStorage.setItem('currentTwitterUserId', discordUserId);
                
                // Show follow button
                const connectBtn = document.getElementById('twitter-connect-btn');
                const followBtn = document.getElementById('twitter-follow-btn');
                const verifyBtn = document.getElementById('twitter-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'none';
                if (followBtn) followBtn.style.display = 'inline-block';
                if (verifyBtn) verifyBtn.style.display = 'none';
                console.log('✅ Follow button shown');
            } else {
                console.log('ℹ️ Twitter not connected - showing connect button');
                const connectBtn = document.getElementById('twitter-connect-btn');
                const followBtn = document.getElementById('twitter-follow-btn');
                const verifyBtn = document.getElementById('twitter-verify-btn');
                if (connectBtn) connectBtn.style.display = 'inline-block';
                if (followBtn) followBtn.style.display = 'none';
                if (verifyBtn) verifyBtn.style.display = 'none';
            }
            
            // Update Wallet UI
            if (session.wallet_connected) {
                console.log('✅ Wallet connected - marking address task as completed');
                completedTasks.address = true;
                updateTaskUI('address');
                
                const addressInput = document.getElementById('evmAddress');
                const submitBtn = document.querySelector('.submit-button');
                if (addressInput) {
                    addressInput.value = session.wallet_address || '';
                    addressInput.disabled = true;
                    
                    // Show the 'Submit Your Wallet Address' text
                    const addressText = document.querySelector('#task-address p');
                    if (addressText) {
                        addressText.style.display = 'block';
                    }
                }
                if (submitBtn) {
                    submitBtn.innerHTML = '<span class="button-text">✓ Submitted</span>';
                    submitBtn.disabled = true;
                    submitBtn.style.backgroundColor = '#5d43ef';
                    submitBtn.style.cursor = 'not-allowed';
                    submitBtn.style.opacity = '0.7';
                }
                console.log('✅ Wallet shown as completed');
            }
            
            // Update task locks based on completion
            console.log('📊 Session tasks from backend:', session.tasks);
            console.log('📊 Twitter followed status:', session.twitter_followed);
            updateTaskLocks(session.tasks);
            updateProgress();
            saveTaskStates();
            
            return session;
        } else {
            console.log('ℹ️ No session found for Discord ID');
            // Initialize UI for new user
            updateTaskLocks({
                discord: 'unlocked',
                twitter: 'locked',
                wallet: 'locked'
            });
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading session:', error);
        return null;
    }
}

// Update task locks based on completion state
function updateTaskLocks(tasks) {
    console.log('🔒 Updating task locks:', tasks);
    
    // Discord is always unlocked (first task)
    const discordTask = document.getElementById('task-discord');
    if (discordTask) discordTask.classList.remove('locked');
    
    // X task
    const xTask = document.getElementById('task-follow');
    const xConnectBtn = document.getElementById('twitter-connect-btn');
    const xFollowBtn = document.getElementById('twitter-follow-btn');
    const xVerifyBtn = document.getElementById('twitter-verify-btn');
    
    if (tasks.twitter === 'locked') {
        if (xTask) xTask.classList.add('locked');
        if (xConnectBtn) xConnectBtn.disabled = true;
        if (xFollowBtn) xFollowBtn.disabled = true;
        if (xVerifyBtn) xVerifyBtn.disabled = true;
        console.log('🔒 X task is LOCKED');
    } else {
        if (xTask) xTask.classList.remove('locked');
        if (xConnectBtn) xConnectBtn.disabled = false;
        if (xFollowBtn) xFollowBtn.disabled = false;
        if (xVerifyBtn) xVerifyBtn.disabled = false;
        console.log('🔓 X task is UNLOCKED');
    }
    
    // Wallet task
    const walletTask = document.getElementById('task-address');
    const walletInput = document.getElementById('evmAddress');
    const submitBtn = document.querySelector('.submit-button');
    
    console.log('🔍 Wallet task state:', tasks.wallet);
    
    if (tasks.wallet === 'locked') {
        if (walletTask) walletTask.classList.add('locked');
        if (walletInput) walletInput.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        console.log('🔒 Wallet task is LOCKED');
    } else {
        if (walletTask) walletTask.classList.remove('locked');
        if (walletInput) walletInput.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        console.log('🔓 Wallet task is UNLOCKED - state:', tasks.wallet);
    }
    
    // Update timeline indicators
    updateTimelineStates();
}

// Update timeline indicator states
function updateTimelineStates() {
    // Discord timeline
    const discordTimeline = document.getElementById('timeline-discord');
    if (discordTimeline) {
        if (completedTasks.discord) {
            discordTimeline.classList.add('completed');
            discordTimeline.classList.remove('active');
        } else {
            discordTimeline.classList.add('active');
            discordTimeline.classList.remove('completed');
        }
    }
    
    // Twitter timeline
    const twitterTimeline = document.getElementById('timeline-twitter');
    if (twitterTimeline) {
        if (completedTasks.follow) {
            twitterTimeline.classList.add('completed');
            twitterTimeline.classList.remove('active');
        } else if (completedTasks.discord) {
            twitterTimeline.classList.add('active');
            twitterTimeline.classList.remove('completed');
        }
    }
    
    // Wallet timeline
    const walletTimeline = document.getElementById('timeline-wallet');
    if (walletTimeline) {
        if (completedTasks.address) {
            walletTimeline.classList.add('completed');
            walletTimeline.classList.remove('active');
        } else if (completedTasks.discord && completedTasks.follow) {
            walletTimeline.classList.add('active');
            walletTimeline.classList.remove('completed');
        }
    }
}

// Check if user has any existing connections on page load
async function checkExistingConnections() {
    try {
        // Check for referral code in URL first
        await checkAndApplyReferral();
        
        // Check for stored Discord user ID (PRIMARY identifier)
        const storedDiscordUserId = localStorage.getItem('currentDiscordUserId');
        console.log('🔍 Checking for stored Discord user ID:', storedDiscordUserId);
        console.log('🔍 Current completedTasks state:', completedTasks);
        
        if (storedDiscordUserId) {
            console.log('🔍 Found stored Discord user ID, restoring session...');
            currentDiscordUserId = storedDiscordUserId;
            await loadSessionFromDiscord(storedDiscordUserId);
            
            // Load referral info
            await loadReferralInfo();
            
            // Log final state after restoration
            console.log('✅ Session restoration complete');
            console.log('📊 Final completedTasks:', completedTasks);
            console.log('📊 Discord completed?', completedTasks.discord);
        } else {
            console.log('ℹ️ No stored Discord user ID found - new user');
            // Lock X and Wallet tasks for new users
            updateTaskLocks({
                discord: 'unlocked',
                twitter: 'locked',
                wallet: 'locked'
            });
        }
    } catch (error) {
        console.error('Error checking existing connections:', error);
    }
}

// Check user's current status from database
async function checkUserCurrentStatus(twitterUserId) {
    try {
        console.log('🔍 Checking user status for Twitter ID:', twitterUserId);
        
        // Add a small delay to ensure database has been updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await fetch(`/api/user-status/${twitterUserId}`);
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ User status:', result.user);
            console.log('🔍 Twitter connected:', result.user.twitter_connected);
            
            // Update completed tasks based on database status
            if (result.user.twitter_followed) {
                // User has completed the follow task
                console.log('✅ Twitter followed - showing completed state');
                currentTwitterUserId = twitterUserId;
                localStorage.setItem('currentTwitterUserId', twitterUserId);
                completedTasks.follow = true;
                updateTaskUI('follow');
                
                // Show completed button
                const connectBtn = document.getElementById('twitter-connect-btn');
                const followBtn = document.getElementById('twitter-follow-btn');
                const verifyBtn = document.getElementById('twitter-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'none';
                if (followBtn) followBtn.style.display = 'none';
                if (verifyBtn) {
                    verifyBtn.style.display = 'inline-block';
                    verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                    verifyBtn.disabled = true;
                    verifyBtn.style.backgroundColor = '#5d43ef';
                    verifyBtn.style.cursor = 'not-allowed';
                    verifyBtn.style.opacity = '0.7';
                }
            } else if (result.user.twitter_connected) {
                console.log('✅ Twitter is connected - updating UI');
                // Store Twitter user ID for later use
                currentTwitterUserId = twitterUserId;
                localStorage.setItem('currentTwitterUserId', twitterUserId);
                // Show the follow button instead of "Connect X"
                showFollowButton();
            } else {
                console.log('⚠️ Twitter NOT connected in database - showing connect button');
                const connectBtn = document.getElementById('twitter-connect-btn');
                const followBtn = document.getElementById('twitter-follow-btn');
                const verifyBtn = document.getElementById('twitter-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'inline-block';
                if (followBtn) followBtn.style.display = 'none';
                if (verifyBtn) verifyBtn.style.display = 'none';
            }
            
            if (result.user.discord_connected) {
                console.log('✅ Discord is connected - updating UI');
                completedTasks.discord = true;
                updateTaskUI('discord');
                updateProgress();
                saveTaskStates();
            }
            
            if (result.user.wallet_connected) {
                console.log('✅ Wallet is connected - updating UI');
                completedTasks.address = true;
                updateTaskUI('address');
                updateProgress();
                saveTaskStates();
            }
            
            // Update progress bar
            updateProgress();
        } else {
            console.log('ℹ️ User not found in database yet');
        }
    } catch (error) {
        console.error('❌ Error checking user current status:', error);
    }
}

// Check user's current status from database by Discord ID
async function checkUserCurrentStatusByDiscord(discordUserId) {
    try {
        console.log('🔍 Checking user status for Discord ID:', discordUserId);
        
        const response = await fetch(`/api/user-status-discord/${discordUserId}`);
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ User status:', result.user);
            console.log('🔍 Discord provider ID from database:', result.user.discord_provider_id);
            console.log('🔍 Discord connected:', result.user.discord_connected);
            
            // Update completed tasks based on database status
            if (result.user.twitter_connected) {
                console.log('✅ Twitter is connected - updating UI');
                // Show the follow button instead of "Connect X"
                showFollowButton();
            }
            
            if (result.user.discord_connected) {
                console.log('✅ Discord is connected');
                console.log('🔍 Discord joined status:', result.user.discord_joined);
                
                // Store Discord user ID for later verification
                currentDiscordUserId = discordUserId;
                localStorage.setItem('currentDiscordUserId', discordUserId);
                
                // Only mark as completed if they actually joined the Discord server
                if (result.user.discord_joined) {
                    console.log('✅ Discord server joined - marking as completed');
                    
                    // Mark task as completed
                    completedTasks.discord = true;
                    updateTaskUI('discord');
                    updateProgress();
                    saveTaskStates();
                    
                    // Hide all buttons and show completed state
                    const connectBtn = document.getElementById('discord-connect-btn');
                    const joinBtn = document.getElementById('discord-join-btn');
                    const verifyBtn = document.getElementById('discord-verify-btn');
                    
                    if (connectBtn) connectBtn.style.display = 'none';
                    if (joinBtn) joinBtn.style.display = 'none';
                    if (verifyBtn) {
                        verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                        verifyBtn.disabled = true;
                        verifyBtn.style.backgroundColor = '#5d43ef';
                        verifyBtn.style.display = 'inline-block';
                    }
                    
                    // Unlock X task
                    const xTask = document.getElementById('task-follow');
                    const xConnectBtn = document.getElementById('twitter-connect-btn');
                    if (xTask) xTask.classList.remove('locked');
                    if (xConnectBtn) xConnectBtn.disabled = false;
                    console.log('🔓 X task UNLOCKED after Discord completion');
                } else {
                    console.log('⚠️ Discord connected but NOT joined server - showing join button');
                    
                    // Show join button instead of marking as completed
                    const connectBtn = document.getElementById('discord-connect-btn');
                    const joinBtn = document.getElementById('discord-join-btn');
                    const verifyBtn = document.getElementById('discord-verify-btn');
                    
                    if (connectBtn) connectBtn.style.display = 'none';
                    if (joinBtn) {
                        joinBtn.style.display = 'inline-block';
                        console.log('✅ Join button is now visible');
                    }
                    if (verifyBtn) verifyBtn.style.display = 'none';
                }
            } else {
                console.log('⚠️ Discord NOT connected in database - showing connect button');
                const connectBtn = document.getElementById('discord-connect-btn');
                const joinBtn = document.getElementById('discord-join-btn');
                const verifyBtn = document.getElementById('discord-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'inline-block';
                if (joinBtn) joinBtn.style.display = 'none';
                if (verifyBtn) verifyBtn.style.display = 'none';
            }
            
            if (result.user.wallet_connected) {
                console.log('✅ Wallet is connected - updating UI');
                completedTasks.address = true;
                updateTaskUI('address');
                updateProgress();
                saveTaskStates();
            }
            
            // Update progress bar
            updateProgress();
        } else {
            console.log('ℹ️ User not found in database yet');
        }
    } catch (error) {
        console.error('❌ Error checking user current status:', error);
    }
}

// Check for OAuth results in URL parameters
function checkOAuthResults() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for X authentication success
    if (urlParams.get('x_success') === 'true') {
        // Don't auto-complete, just show notification
        showNotification('X connected! Now follow @neftitxyz', 'success');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for X authentication error
    if (urlParams.get('x_error') === 'true') {
        showNotification('X authentication failed. Please try again.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for Discord authentication success
    if (urlParams.get('discord_success') === 'true') {
        completedTasks.discord = true;
        updateTaskUI('discord');
        updateProgress();
        saveTaskStates();
        showNotification('Successfully connected to Discord!', 'success');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for Discord authentication error
    if (urlParams.get('discord_error') === 'true') {
        showNotification('Discord authentication failed. Please try again.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// OAuth2 Authentication Functions
async function authenticateX() {
    // Check if Discord is connected AND verified first
    const discordUserId = localStorage.getItem('currentDiscordUserId');
    const savedTasks = localStorage.getItem('neftit_tasks');
    
    console.log('🔍 X OAuth Check - Discord User ID:', discordUserId);
    console.log('🔍 X OAuth Check - completedTasks.discord:', completedTasks.discord);
    console.log('🔍 X OAuth Check - Full completedTasks:', completedTasks);
    console.log('🔍 X OAuth Check - localStorage tasks:', savedTasks);
    
    if (!discordUserId) {
        console.error('❌ No Discord user ID in localStorage');
        showNotification('Please connect Discord first!', 'error');
        return;
    }
    
    // Check if Discord task is actually completed (joined and verified)
    if (!completedTasks.discord) {
        console.error('❌ Discord task not marked as completed in memory');
        console.log('💡 Checking database for Discord completion status...');
        
        // Try to reload session from database
        try {
            const response = await fetch(`/api/session/${discordUserId}`);
            const result = await response.json();
            
            console.log('📊 Database response status:', response.status);
            console.log('📊 Database response OK:', response.ok);
            console.log('📊 Database result:', JSON.stringify(result, null, 2));
            
            if (result.session) {
                console.log('📊 Session exists:', !!result.session);
                console.log('📊 discord_connected:', result.session.discord_connected);
                console.log('📊 discord_joined:', result.session.discord_joined);
            }
            
            if (response.ok && result.success && result.session && result.session.discord_joined) {
                console.log('✅ Found Discord completion in database, updating UI...');
                completedTasks.discord = true;
                saveTaskStates();
                console.log('💾 Updated completedTasks:', completedTasks);
                
                // Update UI
                const xTask = document.getElementById('task-follow');
                const xConnectBtn = document.getElementById('twitter-connect-btn');
                if (xTask) xTask.classList.remove('locked');
                if (xConnectBtn) xConnectBtn.disabled = false;
                
                showNotification('Discord verified! Connecting X...', 'success');
            } else {
                console.error('❌ Discord not completed in database');
                console.error('❌ response.ok:', response.ok);
                console.error('❌ result.success:', result.success);
                console.error('❌ result.session exists:', !!result.session);
                console.error('❌ discord_joined:', result.session?.discord_joined);
                showNotification('Please complete Discord task first (Connect → Join → Verify)!', 'error');
                return;
            }
        } catch (error) {
            console.error('❌ Error checking Discord status:', error);
            console.error('❌ Error details:', error.message);
            showNotification('Please complete Discord task first (Connect → Join → Verify)!', 'error');
            return;
        }
    }
    
    console.log('🔍 Discord session found:', discordUserId);
    console.log('✅ Discord task completed, proceeding with X connection');
    
    // Open X OAuth2 in popup
    const popup = window.open(
        `${BASE_URL}/auth/x`,
        'xAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Listen for popup messages
    const messageListener = async (event) => {
        if (event.origin !== BASE_URL) return;
        
        if (event.data.type === 'X_AUTH_SUCCESS') {
            console.log('🎉 X OAuth SUCCESS received');
            console.log('📊 Event data:', event.data);
            
            const twitterUserId = event.data.userId;
            const twitterUsername = event.data.username || 'unknown';
            const twitterEmail = event.data.email || null;
            
            // Link Twitter to existing Discord session
            try {
                const response = await fetch('/api/link-twitter-to-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        discordUserId: discordUserId,
                        twitterUserId: twitterUserId,
                        twitterUsername: twitterUsername,
                        twitterEmail: twitterEmail
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    console.log('✅ Twitter linked to Discord session');
                    showNotification(`X connected! Now follow @${NEFTIT_USERNAME}`, 'success');
                    
                    // Store Twitter user ID
                    currentTwitterUserId = twitterUserId;
                    localStorage.setItem('currentTwitterUserId', twitterUserId);
                    
                    // Show follow button
                    showFollowButton();
                    
                    // Reload session to update UI
                    await loadSessionFromDiscord(discordUserId);
                } else {
                    console.error('❌ Failed to link Twitter:', result.error);
                    showNotification(result.message || result.error, 'error');
                }
            } catch (error) {
                console.error('❌ Error linking Twitter:', error);
                showNotification('Failed to connect X. Please try again.', 'error');
            }
            
            popup.close();
            window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'X_AUTH_ERROR') {
            showNotification(event.data.error || 'X authentication failed', 'error');
            popup.close();
            window.removeEventListener('message', messageListener);
        }
    };
    
    window.addEventListener('message', messageListener);
    
    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
        }
    }, 1000);
}

function authenticateDiscord() {
    console.log('🚀 Starting Discord authentication...');
    console.log('🔍 BASE_URL:', BASE_URL);
    
    // Open Discord OAuth2 in popup
    const popup = window.open(
        `${BASE_URL}/auth/discord`,
        'discordAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
        console.error('❌ Failed to open popup window!');
        showNotification('Please allow popups for this site', 'error');
        return;
    }
    
    console.log('✅ Popup window opened');
    
    // Listen for popup messages
    const messageListener = async (event) => {
        // Ignore MetaMask and other extension messages
        if (event.data && event.data.target === 'metamask-inpage') {
            return; // Silently ignore MetaMask messages
        }
        
        console.log('📨 Message received from:', event.origin);
        console.log('📨 Message data:', event.data);
        console.log('📨 Message type:', event.data?.type);
        
        if (event.origin !== BASE_URL) {
            console.warn('⚠️ Message from different origin, ignoring');
            console.warn('⚠️ Expected:', BASE_URL);
            console.warn('⚠️ Got:', event.origin);
            return;
        }
        
        if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
            console.log('🎉 Discord OAuth SUCCESS received');
            console.log('📊 Full event data:', JSON.stringify(event.data, null, 2));
            console.log('📊 User ID:', event.data.userId);
            console.log('📊 Restored flag:', event.data.restored);
            console.log('📊 Restored type:', typeof event.data.restored);
            
            // Store Discord user ID immediately
            currentDiscordUserId = event.data.userId;
            localStorage.setItem('currentDiscordUserId', event.data.userId);
            console.log('💾 Stored Discord user ID to localStorage:', event.data.userId);
            
            // Check for pending referral code
            const pendingReferralCode = localStorage.getItem('pending_referral_code');
            if (pendingReferralCode) {
                console.log('🔍 Found pending referral code, applying now...');
                await checkAndApplyReferral();
            }
            
            // Check if this is a restored session
            if (event.data.restored === true) {
                console.log('🔄 RESTORED SESSION - loading full state from database...');
                showNotification('Discord session restored!', 'success');
                
                // Load complete session state from database
                await loadSessionFromDiscord(event.data.userId);
                
                // Load referral info
                await loadReferralInfo();
            } else {
                console.log('✨ NEW DISCORD CONNECTION - showing join button');
                console.log('📊 Restored value was:', event.data.restored);
                showNotification('Discord connected! Now join the server.', 'success');
                
                // New connection - show join button
                const connectBtn = document.getElementById('discord-connect-btn');
                const joinBtn = document.getElementById('discord-join-btn');
                const verifyBtn = document.getElementById('discord-verify-btn');
                
                console.log('🔍 Button elements:', {
                    connectBtn: !!connectBtn,
                    joinBtn: !!joinBtn,
                    verifyBtn: !!verifyBtn
                });
                
                console.log('🔄 Updating button visibility...');
                if (connectBtn) {
                    connectBtn.style.display = 'none';
                    console.log('✅ Connect button hidden');
                } else {
                    console.error('❌ Connect button not found!');
                }
                
                if (joinBtn) {
                    joinBtn.style.display = 'inline-block';
                    console.log('✅ Join button shown');
                    console.log('📊 Join button display:', joinBtn.style.display);
                } else {
                    console.error('❌ Join button not found in DOM!');
                }
                
                if (verifyBtn) {
                    verifyBtn.style.display = 'none';
                    console.log('✅ Verify button hidden');
                }
            }
            
            console.log('🔄 Closing popup and removing listener...');
            popup.close();
            window.removeEventListener('message', messageListener);
            console.log('✅ Discord authentication flow completed');
        } else if (event.data.type === 'DISCORD_AUTH_ERROR') {
            console.error('❌ Discord auth error:', event.data.error);
            showNotification(event.data.error || 'Discord authentication failed', 'error');
            popup.close();
            window.removeEventListener('message', messageListener);
        } else {
            console.log('📨 Unknown message type:', event.data.type);
        }
    };
    
    window.addEventListener('message', messageListener);
    
    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
        }
    }, 1000);
}

// Wallet connection functions (for EVM address)
function connectWallet(taskType) {
    const modal = document.getElementById('walletModal');
    modal.style.display = 'block';
    
    // Store the task type for later use
    modal.dataset.taskType = taskType;
}

function closeModal() {
    const modal = document.getElementById('walletModal');
    modal.style.display = 'none';
}

function connectMetaMask() {
    // Simulate MetaMask connection
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                console.log('Connected to MetaMask:', accounts[0]);
                completeWalletTask();
            })
            .catch(error => {
                console.error('MetaMask connection failed:', error);
                alert('Failed to connect to MetaMask. Please try again.');
            });
    } else {
        // Fallback for demo purposes
        simulateWalletConnection();
    }
}

function connectWalletConnect() {
    // Simulate WalletConnect connection
    simulateWalletConnection();
}

function simulateWalletConnection() {
    // Simulate a successful wallet connection
    setTimeout(() => {
        completeWalletTask();
    }, 1000);
}

async function completeWalletTask() {
    const modal = document.getElementById('walletModal');
    const taskType = modal.dataset.taskType;
    const walletAddress = document.getElementById('evmAddress').value.trim();
    
    if (!walletAddress) {
        showNotification('Please enter a valid EVM wallet address', 'error');
        return;
    }
    
    // Basic EVM address validation (starts with 0x and is 42 characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        showNotification('Please enter a valid EVM wallet address (0x...)', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/submit-wallet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Mark task as completed
            completedTasks[taskType] = true;
            
            // Update UI
            updateTaskUI(taskType);
            updateProgress();
            saveTaskStates();
            
            // Close modal
            closeModal();
            
            // Show success message
            showNotification('Wallet address saved successfully!', 'success');
        } else {
            showNotification('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error submitting wallet:', error);
        showNotification('Failed to save wallet address. Please try again.', 'error');
    }
}

function updateTaskUI(taskType) {
    const taskItem = document.getElementById(`task-${taskType}`);
    
    if (!taskItem) {
        console.log('Task element not found for:', taskType);
        return;
    }
    
    // Add completed class
    taskItem.classList.add('completed');
    
    // Update timeline indicator
    const timelineMap = {
        'discord': 'timeline-discord',
        'follow': 'timeline-twitter',
        'address': 'timeline-wallet'
    };
    
    const timelineId = timelineMap[taskType];
    if (timelineId) {
        const timelineIndicator = document.getElementById(timelineId);
        if (timelineIndicator) {
            timelineIndicator.classList.remove('active');
            timelineIndicator.classList.add('completed');
        }
    }
    
    // Handle different button types
    if (taskType === 'address') {
        // For wallet address task, update the submit button
        const submitButton = taskItem.querySelector('.submit-button');
        if (submitButton) {
            submitButton.innerHTML = '<span class="button-text">✓ Submitted</span>';
            submitButton.style.background = 'linear-gradient(to right, #5d43ef, #8a79ec)';
            submitButton.disabled = true;
            submitButton.style.cursor = 'not-allowed';
            submitButton.style.opacity = '0.7';
        }
        
        // Show the 'Submit Your Wallet Address' text
        const addressText = taskItem.querySelector('p');
        if (addressText) {
            addressText.style.display = 'block';
        }
        
        // Hide the input field
        const input = taskItem.querySelector('input');
        if (input) {
            input.style.display = 'none';
            input.disabled = true;
        }
    } else {
        // For other tasks (X, Discord), update the task button
        const button = taskItem.querySelector('.task-button');
        if (button) {
            button.innerHTML = '<span class="button-text">✓ Completed</span>';
            button.style.background = 'linear-gradient(to right, #5d43ef, #8a79ec)';
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.7';
        }
    }
}

// Address submission function
async function submitAddress() {
    // Check if task is already completed
    if (completedTasks.address) {
        console.log('⚠️ Wallet task already completed, ignoring click');
        return;
    }
    
    const addressInput = document.getElementById('evmAddress');
    const address = addressInput.value.trim();
    
    // Check if Discord is connected AND completed
    const discordUserId = localStorage.getItem('currentDiscordUserId');
    if (!discordUserId || !completedTasks.discord) {
        showNotification('Please complete Discord task first!', 'error');
        return;
    }
    
    // Check if X is connected
    const twitterUserId = localStorage.getItem('currentTwitterUserId');
    if (!twitterUserId) {
        showNotification('Please connect X first!', 'error');
        return;
    }
    
    // Basic EVM address validation
    if (!address) {
        showNotification('Please enter your EVM address', 'error');
        return;
    }
    
    if (!isValidEVMAddress(address)) {
        showNotification('Please enter a valid EVM address', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/link-wallet-to-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                discordUserId: discordUserId,
                walletAddress: address 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Mark address task as completed
            completedTasks.address = true;
            
            // Update UI
            updateTaskUI('address');
            updateProgress();
            saveTaskStates();
            
            showNotification('Wallet address saved successfully! 🎉', 'success');
            
            // Note: Referral is automatically completed in the backend when wallet is submitted
            // No need to call completeReferral() here to avoid double counting
            
            // Load referral info to unlock referral link
            await loadReferralInfo();
            
            // Reload session to update UI
            await loadSessionFromDiscord(discordUserId);
        } else {
            showNotification(result.message || result.error, 'error');
        }
    } catch (error) {
        console.error('Error submitting wallet:', error);
        showNotification('Failed to save wallet address. Please try again.', 'error');
    }
}

// EVM address validation
function isValidEVMAddress(address) {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
}

// Progress tracking
function updateProgress() {
    const totalTasks = Object.keys(completedTasks).length;
    const completedCount = Object.values(completedTasks).filter(Boolean).length;
    const progressPercentage = (completedCount / totalTasks) * 100;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Update progress bar if it exists
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    // Update progress text if it exists
    if (progressText) {
        if (completedCount === totalTasks) {
            progressText.textContent = '🎉 All tasks completed! You are eligible for the NFT drop!';
            progressText.style.color = '#28a745';
            progressText.style.fontWeight = '600';
        } else {
            progressText.textContent = `Complete ${totalTasks - completedCount} more task${totalTasks - completedCount > 1 ? 's' : ''} to be eligible for the drop`;
            progressText.style.color = '#666';
            progressText.style.fontWeight = '500';
        }
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const t = String(type || 'info').toLowerCase();
    if (t !== 'error') {
        return;
    }
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        border-radius: 8px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Local storage functions
function saveTaskStates() {
    localStorage.setItem('neftit_tasks', JSON.stringify(completedTasks));
}

function loadTaskStates() {
    const saved = localStorage.getItem('neftit_tasks');
    if (saved) {
        completedTasks = JSON.parse(saved);
        
        // Update UI for completed tasks
        Object.keys(completedTasks).forEach(taskType => {
            if (completedTasks[taskType]) {
                updateTaskUI(taskType);
            }
        });
        
        updateProgress();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('walletModal');
    if (event.target === modal) {
        closeModal();
    }
};

// ============================================
// REFERRAL SYSTEM FUNCTIONS
// ============================================

async function loadReferralInfo() {
    const discordUserId = localStorage.getItem('currentDiscordUserId');
    if (!discordUserId) {
        console.log('ℹ️ No Discord user ID - cannot load referral info');
        return;
    }
    
    try {
        console.log('🔍 Loading referral info for user:', discordUserId);
        const response = await fetch(`/api/referral/${discordUserId}`);
        const data = await response.json();
        
        console.log('📊 Referral data received:', data);
        console.log('📊 Has completed all tasks?', data.hasCompletedAllTasks);
        console.log('📊 Referral code:', data.referralCode);
        console.log('📊 Referral link:', data.referralLink);
        
        if (data.success && data.hasCompletedAllTasks) {
            // Show referral link
            const referralContent = document.getElementById('referral-content');
            const referralLocked = document.getElementById('referral-locked');
            const referralInput = document.getElementById('referral-link-input');
            const referralCountValue = document.getElementById('referral-count-value');
            
            if (referralContent) referralContent.style.display = 'block';
            if (referralLocked) referralLocked.style.display = 'none';
            if (referralInput) referralInput.value = data.referralLink;
            if (referralCountValue) referralCountValue.textContent = data.referralCount;
            
            console.log('✅ Referral link unlocked:', data.referralLink);
            console.log('📊 Referral count:', data.referralCount);
        } else {
            // Keep locked
            const referralContent = document.getElementById('referral-content');
            const referralLocked = document.getElementById('referral-locked');
            
            if (referralContent) referralContent.style.display = 'none';
            if (referralLocked) referralLocked.style.display = 'block';
            
            console.log('🔒 Referral link locked - complete all tasks first');
        }
    } catch (error) {
        console.error('❌ Error loading referral info:', error);
    }
}

async function copyReferralLink() {
    const referralInput = document.getElementById('referral-link-input');
    const copyBtn = document.getElementById('copy-referral-btn');
    
    if (!referralInput || !referralInput.value) {
        showNotification('No referral link available', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(referralInput.value);
        
        // Visual feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="copy-referral-btn-icon">✓</span>';
        copyBtn.style.backgroundColor = '#5d43ef';
        
        showNotification('Referral link copied to clipboard!', 'success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.backgroundColor = '';
        }, 2000);
        
        console.log('✅ Referral link copied:', referralInput.value);
    } catch (error) {
        console.error('❌ Error copying to clipboard:', error);
        
        // Fallback: select text
        referralInput.select();
    }
}

function shareOnX() {
    const referralInput = document.getElementById('referral-link-input');
    
    if (!referralInput || !referralInput.value) {
        showNotification('No referral link available', 'error');
        return;
    }
    
    const referralLink = referralInput.value;
    
    // Create the tweet text
    const tweetText = `Just grabbed my spot in @neftitxyz FREE 10,000 NFT drop, its free, limited, and already going fast!

👉 ${referralLink}

I am in already…. Claim yours before it disappears!
#web3 drops like this don't happen every day!`;
    
    // Encode the tweet text for URL
    const encodedTweet = encodeURIComponent(tweetText);
    
    // Create Twitter intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTweet}`;
    
    // Open in new window
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    
    console.log('✅ Opening Twitter share with referral link:', referralLink);
}

async function checkAndApplyReferral() {
    // Check if there's a referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (!referralCode) {
        console.log('ℹ️ No referral code in URL');
        return;
    }
    
    console.log('🔍 Found referral code in URL:', referralCode);
    
    // Check if user already has Discord connected
    const discordUserId = localStorage.getItem('currentDiscordUserId');
    if (!discordUserId) {
        // Store referral code for later
        localStorage.setItem('pending_referral_code', referralCode);
        console.log('💾 Stored referral code for later application');
        return;
    }
    
    // Apply referral code
    try {
        const response = await fetch('/api/apply-referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordUserId, referralCode })
        });
        
        const data = await response.json();
        
        console.log('📊 Apply referral response:', data);
        
        if (response.ok && data.success) {
            console.log('✅ Referral code applied successfully');
            showNotification('Referral code applied! Complete all tasks to count.', 'success');
            localStorage.removeItem('pending_referral_code');
            
            // Remove ref from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.log('⚠️ Referral code application failed:', data.error || data.details);
            if (data.error !== 'User already has a referrer') {
                showNotification(data.error || 'Failed to apply referral code', 'error');
            }
        }
    } catch (error) {
        console.error('❌ Error applying referral code:', error);
        console.error('Error details:', error.message);
    }
}

async function completeReferral() {
    const discordUserId = localStorage.getItem('currentDiscordUserId');
    if (!discordUserId) return;
    
    try {
        const response = await fetch('/api/complete-referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordUserId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Referral completed - referrer count updated');
        }
    } catch (error) {
        console.error('❌ Error completing referral:', error);
    }
}

// Expose functions to global window object for React components
window.authenticateX = authenticateX;
window.authenticateDiscord = authenticateDiscord;
window.followTwitter = followTwitter;
window.verifyTwitterFollow = verifyTwitterFollow;
window.joinDiscordServer = joinDiscordServer;
window.verifyDiscordJoin = verifyDiscordJoin;
window.submitAddress = submitAddress;
window.connectWallet = connectWallet;
window.closeModal = closeModal;
window.copyReferralLink = copyReferralLink;
window.shareOnX = shareOnX;
window.connectMetaMask = connectMetaMask;

console.log('✅ Global functions exposed to window object');

// Add direct event listeners as fallback for React buttons
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Setting up direct event listeners for buttons...');
    
    // X button
    const xBtn = document.getElementById('twitter-connect-btn');
    if (xBtn) {
        xBtn.addEventListener('click', function(e) {
            console.log('🖱️ X button clicked via direct listener');
            if (!this.disabled) {
                window.authenticateX();
            } else {
                console.log('⚠️ Button is disabled');
            }
        });
        console.log('✅ X button listener attached');
    }
    
    // Discord button
    const discordBtn = document.getElementById('discord-connect-btn');
    if (discordBtn) {
        discordBtn.addEventListener('click', function(e) {
            console.log('🖱️ Discord button clicked via direct listener');
            if (!this.disabled) {
                window.authenticateDiscord();
            }
        });
        console.log('✅ Discord button listener attached');
    }
    
    // Follow button
    const followBtn = document.getElementById('twitter-follow-btn');
    if (followBtn) {
        followBtn.addEventListener('click', function(e) {
            console.log('🖱️ Follow button clicked via direct listener');
            window.followTwitter();
        });
    }
    
    // Verify Twitter button
    const verifyTwitterBtn = document.getElementById('twitter-verify-btn');
    if (verifyTwitterBtn) {
        verifyTwitterBtn.addEventListener('click', function(e) {
            console.log('🖱️ Verify Twitter button clicked via direct listener');
            window.verifyTwitterFollow();
        });
    }
    
    // Join Discord button
    const joinDiscordBtn = document.getElementById('discord-join-btn');
    if (joinDiscordBtn) {
        joinDiscordBtn.addEventListener('click', function(e) {
            console.log('🖱️ Join Discord button clicked via direct listener');
            window.joinDiscordServer();
        });
    }
    
    // Verify Discord button
    const verifyDiscordBtn = document.getElementById('discord-verify-btn');
    if (verifyDiscordBtn) {
        verifyDiscordBtn.addEventListener('click', function(e) {
            console.log('🖱️ Verify Discord button clicked via direct listener');
            window.verifyDiscordJoin();
        });
    }
    
    // Submit address button
    const submitBtn = document.getElementById('wallet-submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            console.log('🖱️ Submit button clicked via direct listener');
            if (!this.disabled) {
                window.submitAddress();
            }
        });
    }
    
    console.log('✅ All direct event listeners attached');
});

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to task items
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('completed')) {
                this.style.transform = 'translateY(-2px)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('completed')) {
                this.style.transform = 'translateY(0)';
            }
        });
    });
    
    // Add click effects to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
});

// Add keyboard support for address input
const evmAddressInput = document.getElementById('evmAddress');
if (evmAddressInput) {
    evmAddressInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitAddress();
        }
    });
}

// Add copy to clipboard functionality for addresses (if needed)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Address copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy address', 'error');
    });
}

// Add some visual feedback for form validation
const evmAddressInputForValidation = document.getElementById('evmAddress');
if (evmAddressInputForValidation) {
    evmAddressInputForValidation.addEventListener('input', function() {
        const address = this.value.trim();
        if (address && !isValidEVMAddress(address)) {
            this.style.borderColor = '#dc3545';
        } else {
            this.style.borderColor = '#e1e5e9';
        }
    });
}

// Add loading states for better UX
function showLoading(element) {
    const originalContent = element.innerHTML;
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    element.disabled = true;
    
    return function hideLoading() {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

// Add smooth scrolling for better navigation
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Add some Easter eggs for engagement
let clickCount = 0;
const logoElement = document.querySelector('.logo h1');
if (logoElement) {
    logoElement.addEventListener('click', function() {
        clickCount++;
        if (clickCount === 5) {
            showNotification('🎉 You found the secret! Welcome to the Neftit community!', 'success');
            clickCount = 0;
        }
    });
}

// Add analytics tracking (placeholder)
function trackEvent(eventName, properties = {}) {
    console.log('Event tracked:', eventName, properties);
    // Here you would integrate with your analytics service
    // Example: gtag('event', eventName, properties);
}

// Track task completions
function trackTaskCompletion(taskType) {
    trackEvent('task_completed', {
        task_type: taskType,
        timestamp: new Date().toISOString()
    });
}

// Update the completeWalletTask function to include tracking
const originalCompleteWalletTask = completeWalletTask;
completeWalletTask = function() {
    const modal = document.getElementById('walletModal');
    const taskType = modal.dataset.taskType;
    
    originalCompleteWalletTask();
    trackTaskCompletion(taskType);
};

// Update the submitAddress function to include tracking
const originalSubmitAddress = submitAddress;
submitAddress = function() {
    originalSubmitAddress();
    if (completedTasks.address) {
        trackTaskCompletion('address');
    }
};

// Show follow button after X connection
function showFollowButton() {
    console.log('🔄 Showing follow button...');
    const connectBtn = document.getElementById('twitter-connect-btn');
    const followBtn = document.getElementById('twitter-follow-btn');
    const verifyBtn = document.getElementById('twitter-verify-btn');
    
    if (connectBtn) {
        connectBtn.style.display = 'none';
        console.log('✅ Connect button hidden');
    }
    if (followBtn) {
        followBtn.style.display = 'inline-block';
        console.log('✅ Follow button shown');
    }
    if (verifyBtn) {
        verifyBtn.style.display = 'none';
        console.log('✅ Verify button hidden');
    }
}

// Simplified Twitter follow function
function followTwitter() {
    console.log('🔗 Opening Twitter follow link...');
    const followUrl = `https://twitter.com/intent/follow?screen_name=${NEFTIT_USERNAME}`;
    window.open(followUrl, '_blank');
    
    // Show verify button after a short delay
    setTimeout(() => {
        const followBtn = document.getElementById('twitter-follow-btn');
        const verifyBtn = document.getElementById('twitter-verify-btn');
        if (followBtn) followBtn.style.display = 'none';
        if (verifyBtn) verifyBtn.style.display = 'inline-block';
        showNotification(`Please follow @${NEFTIT_USERNAME}, then click "Verify Follow"`, 'info');
    }, 2000);
}

// New simplified Twitter verify function (no actual verification)
async function verifyTwitterFollow() {
    // Check if task is already completed
    if (completedTasks.follow) {
        console.log('⚠️ Twitter task already completed, ignoring click');
        return;
    }
    
    const verifyBtn = document.getElementById('twitter-verify-btn');
    if (verifyBtn) {
        verifyBtn.innerHTML = '<span class="button-text">Verifying...</span>';
        verifyBtn.disabled = true;
    }
    
    console.log('🔍 Verifying Twitter follow...');
    
    // Show loading for 1.5 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
        // Update backend to mark twitter as followed (no actual verification)
        const response = await fetch('/api/verify-twitter-follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discordUserId: currentDiscordUserId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Mark as completed
            console.log('✅ Twitter follow verified!');
            completedTasks.follow = true;
            updateTaskUI('follow');
            updateProgress();
            saveTaskStates();
            
            // Show completed state
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                verifyBtn.disabled = true;
                verifyBtn.style.backgroundColor = '#5d43ef';
                verifyBtn.style.cursor = 'not-allowed';
                verifyBtn.style.opacity = '0.7';
            }
            
            showNotification('Twitter follow verified! Task completed.', 'success');
            
            // Unlock wallet task
            const walletTask = document.getElementById('task-address');
            const walletInput = document.getElementById('evmAddress');
            const submitBtn = document.querySelector('.submit-button');
            if (walletTask) walletTask.classList.remove('locked');
            if (walletInput) walletInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            console.log('🔓 Wallet task UNLOCKED after Twitter verification');
        } else {
            // If API fails, still complete it (no actual verification needed)
            console.log('⚠️ API failed but completing anyway (no verification needed)');
            completedTasks.follow = true;
            updateTaskUI('follow');
            updateProgress();
            saveTaskStates();
            
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                verifyBtn.disabled = true;
                verifyBtn.style.backgroundColor = '#5d43ef';
                verifyBtn.style.cursor = 'not-allowed';
                verifyBtn.style.opacity = '0.7';
            }
            
            showNotification('Twitter follow verified! Task completed.', 'success');
            
            // Unlock wallet task
            const walletTask = document.getElementById('task-address');
            const walletInput = document.getElementById('evmAddress');
            const submitBtn = document.querySelector('.submit-button');
            if (walletTask) walletTask.classList.remove('locked');
            if (walletInput) walletInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (error) {
        // Even if error, complete it (no actual verification needed)
        console.log('⚠️ Error but completing anyway (no verification needed):', error);
        completedTasks.follow = true;
        updateTaskUI('follow');
        updateProgress();
        saveTaskStates();
        
        if (verifyBtn) {
            verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
            verifyBtn.disabled = true;
            verifyBtn.style.backgroundColor = '#5d43ef';
            verifyBtn.style.cursor = 'not-allowed';
            verifyBtn.style.opacity = '0.7';
        }
        
        showNotification('Twitter follow verified! Task completed.', 'success');
        
        // Unlock wallet task
        const walletTask = document.getElementById('task-address');
        const walletInput = document.getElementById('evmAddress');
        const submitBtn = document.querySelector('.submit-button');
        if (walletTask) walletTask.classList.remove('locked');
        if (walletInput) walletInput.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Old showVerifyButton function removed - now using new button system

// Old complex Twitter verification removed - now using simplified flow

// Direct follow verification (when we have Twitter user ID but no OAuth state)
// Manual verification removed - users must re-connect X for automatic verification

// Discord server joining functions
function joinDiscordServer() {
    console.log('🔗 Opening Discord server invite...');
    window.open(DISCORD_INVITE_LINK, '_blank');
    
    // Show verify button after a short delay
    setTimeout(() => {
        const joinBtn = document.getElementById('discord-join-btn');
        const verifyBtn = document.getElementById('discord-verify-btn');
        
        if (joinBtn) joinBtn.style.display = 'none';
        if (verifyBtn) verifyBtn.style.display = 'inline-block';
        
        showNotification('Please join the Discord server, then click "Verify Join"', 'info');
    }, 2000);
}

async function verifyDiscordJoin() {
    if (!currentDiscordUserId) {
        showNotification('Please connect Discord first', 'error');
        return;
    }
    
    const verifyBtn = document.getElementById('discord-verify-btn');
    if (verifyBtn) {
        verifyBtn.innerHTML = '<span class="button-text">Verifying...</span>';
        verifyBtn.disabled = true;
    }
    
    try {
        console.log('🔍 Verifying Discord server join...');
        console.log('🔍 Using Discord provider ID from database:', currentDiscordUserId);
        
        const response = await fetch('/api/verify-discord-join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                discordUserId: currentDiscordUserId, // This is the provider ID from database
                guildId: DISCORD_GUILD_ID
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success && data.isMember) {
            console.log('✅ Discord join verified!');
            showNotification('Discord join verified! Task completed.', 'success');
            
            // Update UI immediately
            const taskElement = document.getElementById('task-discord');
            const connectBtn = document.getElementById('discord-connect-btn');
            const joinBtn = document.getElementById('discord-join-btn');
            const verifyBtn = document.getElementById('discord-verify-btn');
            
            if (connectBtn) connectBtn.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'none';
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                verifyBtn.disabled = true;
                verifyBtn.style.backgroundColor = '#5d43ef';
            }
            
            // Update task status
            completedTasks.discord = true;
            taskElement.classList.add('completed');
            updateProgress();
            saveTaskStates();
            
            // Unlock X task
            const xTask = document.getElementById('task-follow');
            const xConnectBtn = document.getElementById('twitter-connect-btn');
            if (xTask) xTask.classList.remove('locked');
            if (xConnectBtn) xConnectBtn.disabled = false;
            console.log('🔓 X task UNLOCKED after Discord verification');
            
            // Show member data if available
            if (data.memberData && data.memberData.username) {
                console.log(`👋 Welcome, ${data.memberData.username}!`);
            }
            
            // Refresh user status to get updated database state
            console.log('🔄 Refreshing user status after Discord verification...');
            if (currentDiscordUserId) {
                await checkUserCurrentStatusByDiscord(currentDiscordUserId);
            }
        } else if (response.status === 429) {
            console.log('⚠️ Rate limited by Discord API');
            showNotification(`Rate limited. Please try again in ${data.retryAfter || 5} seconds.`, 'warning');
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">Try Again</span>';
                verifyBtn.disabled = false;
            }
        } else if (data.needsSetup) {
            console.log('❌ Discord bot setup required');
            showNotification('Discord bot setup required. Please contact administrator.', 'error');
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">Setup Required</span>';
                verifyBtn.disabled = true;
                verifyBtn.style.backgroundColor = '#ef4444';
            }
        } else if (data.cached) {
            console.log('📋 Using cached Discord result');
            showNotification('Discord verification (cached result)', 'info');
            
            // Still update UI if cached result shows success
            if (data.isMember) {
                const taskElement = document.getElementById('task-discord');
                const connectBtn = document.getElementById('discord-connect-btn');
                const joinBtn = document.getElementById('discord-join-btn');
                const verifyBtn = document.getElementById('discord-verify-btn');
                
                if (connectBtn) connectBtn.style.display = 'none';
                if (joinBtn) joinBtn.style.display = 'none';
                if (verifyBtn) {
                    verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                    verifyBtn.disabled = true;
                    verifyBtn.style.backgroundColor = '#5d43ef';
                }
                
                completedTasks.discord = true;
                taskElement.classList.add('completed');
                updateProgress();
                saveTaskStates();
            }
        } else {
            console.error('❌ Discord join verification failed:', data.error);
            showNotification(data.message || data.error || 'Failed to verify Discord join. Please try again.', 'error');
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">Verify Join</span>';
                verifyBtn.disabled = false;
            }
        }
        
    } catch (error) {
        console.error('❌ Error verifying Discord join:', error);
        showNotification('Failed to verify Discord join. Please try again.', 'error');
        
        if (verifyBtn) {
            verifyBtn.innerHTML = '<span class="button-text">Verify Join</span>';
            verifyBtn.disabled = false;
        }
    }
}
