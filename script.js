// Global state for task completion
let completedTasks = {
    follow: false,
    discord: false,
    address: false
};

// Store OAuth state for follow verification
let currentOAuthState = null;
let currentTwitterUserId = null;

// Discord server invite link
const DISCORD_INVITE_LINK = 'https://discord.com/invite/Xc54PrHv7w';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    loadTaskStates();
    checkOAuthResults();
    checkUserStatus();
    checkExistingConnections();
});

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

// Check if user has any existing connections on page load
async function checkExistingConnections() {
    try {
        // Try to get user status from localStorage or check if we have any stored data
        const storedUserId = localStorage.getItem('currentTwitterUserId');
        console.log('🔍 Checking for stored user ID:', storedUserId);
        
        if (storedUserId) {
            console.log('🔍 Found stored Twitter user ID, checking status...');
            currentTwitterUserId = storedUserId;
            await checkUserCurrentStatus(storedUserId);
        } else {
            console.log('ℹ️ No stored user ID found');
        }
    } catch (error) {
        console.error('Error checking existing connections:', error);
    }
}

// Check user's current status from database
async function checkUserCurrentStatus(twitterUserId) {
    try {
        console.log('🔍 Checking user status for Twitter ID:', twitterUserId);
        
        const response = await fetch(`/api/user-status/${twitterUserId}`);
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ User status:', result.user);
            
            // Update completed tasks based on database status
            if (result.user.twitter_connected) {
                console.log('✅ Twitter is connected - updating UI');
                // Show the follow button instead of "Connect X"
                showFollowButton();
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
            
            // Update completed tasks based on database status
            if (result.user.twitter_connected) {
                console.log('✅ Twitter is connected - updating UI');
                // Show the follow button instead of "Connect X"
                showFollowButton();
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

// Check for OAuth results in URL parameters
function checkOAuthResults() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for X authentication success
    if (urlParams.get('x_success') === 'true') {
        completedTasks.follow = true;
        updateTaskUI('follow');
        updateProgress();
        saveTaskStates();
        showNotification('Successfully connected to X!', 'success');
        
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
function authenticateX() {
    // Open X OAuth2 in popup
    const popup = window.open(
        'http://localhost:3000/auth/x',
        'xAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Listen for popup messages
    const messageListener = (event) => {
        if (event.origin !== 'http://localhost:3000') return;
        
        if (event.data.type === 'X_AUTH_SUCCESS') {
            // Store OAuth state and user ID for follow verification
            currentOAuthState = event.data.state || 'unknown';
            currentTwitterUserId = event.data.userId;
            
            // Store user ID in localStorage for persistence
            localStorage.setItem('currentTwitterUserId', event.data.userId);
            
            // Check if this is a restored session
            if (event.data.restored) {
                showNotification('X session restored!', 'success');
            } else {
                showNotification('X connected! Now follow @neftitxyz', 'success');
            }
            
            // Show follow button instead of completing task
            showFollowButton();
            
            // Check user's current status from database
            checkUserCurrentStatus(event.data.userId);
            popup.close();
            window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'X_AUTH_ERROR') {
            showNotification('X authentication failed. Please try again.', 'error');
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
    // Open Discord OAuth2 in popup
    const popup = window.open(
        'http://localhost:3000/auth/discord',
        'discordAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Listen for popup messages
    const messageListener = (event) => {
        if (event.origin !== 'http://localhost:3000') return;
        
        if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
            // Check if this is a restored session
            if (event.data.restored) {
                showNotification('Discord session restored!', 'success');
            } else {
                showNotification('Successfully connected to Discord!', 'success');
            }
            
            // Store Discord user ID
            currentDiscordUserId = event.data.userId;
            
            // Show join button instead of marking as completed
            const connectBtn = document.getElementById('discord-connect-btn');
            const joinBtn = document.getElementById('discord-join-btn');
            
            if (connectBtn) connectBtn.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'inline-block';
            
            // Check user status by Discord ID
            checkUserCurrentStatusByDiscord(event.data.userId);
            
            popup.close();
            window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'DISCORD_AUTH_ERROR') {
            showNotification('Discord authentication failed. Please try again.', 'error');
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
    
    // Handle different button types
    if (taskType === 'address') {
        // For wallet address task, update the submit button
        const submitButton = taskItem.querySelector('.submit-button');
        if (submitButton) {
            submitButton.innerHTML = '<span class="button-text">Completed</span><i class="fas fa-check"></i>';
            submitButton.style.background = '#28a745';
            submitButton.disabled = true;
        }
        
        // Also hide the input field
        const input = taskItem.querySelector('input');
        if (input) {
            input.style.display = 'none';
        }
    } else {
        // For other tasks (X, Discord), update the task button
        const button = taskItem.querySelector('.task-button');
        if (button) {
            button.innerHTML = '<span class="button-text">Completed</span><i class="fas fa-check"></i>';
            button.style.background = '#28a745';
            button.disabled = true;
        }
    }
}

// Address submission function
async function submitAddress() {
    const addressInput = document.getElementById('evmAddress');
    const address = addressInput.value.trim();
    
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
        const response = await fetch('/api/submit-wallet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: address })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Mark address task as completed
            completedTasks.address = true;
            
            // Update UI
            updateTaskUI('address');
            updateProgress();
            saveTaskStates();
            
            showNotification('Wallet address saved successfully!', 'success');
        } else {
            showNotification('Error: ' + result.error, 'error');
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
}

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
    const taskItem = document.getElementById('task-follow');
    const button = taskItem.querySelector('.task-button');
    
    if (button) {
        button.innerHTML = '<span class="button-text">Follow @neftitxyz</span>';
        button.style.background = '#1da1f2';
        button.onclick = followNeftit;
    }
}

// Follow @neftitxyz on Twitter
function followNeftit() {
    const followUrl = 'https://twitter.com/intent/follow?screen_name=neftitxyz';
    window.open(followUrl, '_blank');
    
    // Show verify button after a short delay
    setTimeout(() => {
        showVerifyButton();
    }, 2000);
}

// Show verify follow button
function showVerifyButton() {
    const taskItem = document.getElementById('task-follow');
    const button = taskItem.querySelector('.task-button');
    
    if (button) {
        button.innerHTML = '<span class="button-text">Verify Follow</span>';
        button.style.background = '#ff6b35';
        button.onclick = verifyFollow;
    }
}

// Verify if user followed @neftitxyz
async function verifyFollow() {
    console.log('🔍 Starting follow verification...');
    console.log('Current OAuth state:', currentOAuthState);
    console.log('Current Twitter user ID:', currentTwitterUserId);
    
    if (!currentOAuthState && !currentTwitterUserId) {
        console.error('❌ No OAuth state or Twitter user ID available');
        showNotification('Please connect X first', 'error');
        return;
    }
    
    // If we have Twitter user ID but no OAuth state, prompt to re-connect X
    if (!currentOAuthState && currentTwitterUserId) {
        console.log('⚠️ No OAuth state but have Twitter user ID - prompting to re-connect X');
        showNotification('Please re-connect to X to verify follow status automatically', 'warning');
        
        const button = document.getElementById('task-follow').querySelector('.task-button');
        if (button) {
            button.innerHTML = '<span class="button-text">Re-connect X to Verify</span>';
            button.disabled = false;
            button.onclick = () => {
                // Clear stored data and redirect to X OAuth
                localStorage.removeItem('currentTwitterUserId');
                currentTwitterUserId = null;
                currentOAuthState = null;
                window.location.href = '/auth/x';
            };
        }
        return;
    }
    
    const button = document.getElementById('task-follow').querySelector('.task-button');
    if (button) {
        button.innerHTML = '<span class="button-text">Verifying...</span>';
        button.disabled = true;
    }
    
    try {
        console.log('📤 Sending verify follow request with state:', currentOAuthState);
        const response = await fetch('/api/verify-follow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state: currentOAuthState })
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', response.headers);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (response.ok) {
            if (result.followed) {
                // User followed successfully
                completedTasks.follow = true;
                updateTaskUI('follow');
                updateProgress();
                saveTaskStates();
                showNotification('Successfully verified follow!', 'success');
            } else {
                // User didn't follow
                showNotification('Please follow @neftitxyz first, then click Verify Follow', 'error');
                
                // Reset button
                if (button) {
                    button.innerHTML = '<span class="button-text">Verify Follow</span>';
                    button.disabled = false;
                }
            }
        } else if (response.status === 429) {
            // Rate limited - offer manual verification
            showNotification('Twitter API rate limited. You can verify manually if you follow @neftitxyz.', 'warning');
            
            // Reset button and offer manual verification
            if (button) {
                button.innerHTML = '<span class="button-text">Verify Manually</span>';
                button.disabled = false;
                button.onclick = () => manualVerifyFollow();
            }
        } else if (response.status === 403) {
            // Insufficient permissions - need to re-authenticate
            showNotification('Please re-connect to X to grant follow reading permissions.', 'error');
            
            // Reset button and clear OAuth state
            if (button) {
                button.innerHTML = '<span class="button-text">Re-connect X</span>';
                button.disabled = false;
                button.onclick = authenticateX; // Change to connect X instead
            }
            
            // Clear OAuth state to force re-authentication
            currentOAuthState = null;
            currentTwitterUserId = null;
        } else {
            showNotification('Error: ' + result.error, 'error');
            
            // Reset button
            if (button) {
                button.innerHTML = '<span class="button-text">Verify Follow</span>';
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('❌ Error verifying follow:', error);
        console.error('❌ Error details:', error.message);
        showNotification('Failed to verify follow. Please try again.', 'error');
        
        // Reset button
        if (button) {
            button.innerHTML = '<span class="button-text">Verify Follow</span>';
            button.disabled = false;
        }
    }
}

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
        
        const response = await fetch('/api/verify-discord-join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                discordUserId: currentDiscordUserId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Discord join verified!');
            showNotification('Discord join verified! Task completed.', 'success');
            
            // Update UI
            const taskElement = document.getElementById('task-discord');
            const connectBtn = document.getElementById('discord-connect-btn');
            const joinBtn = document.getElementById('discord-join-btn');
            const verifyBtn = document.getElementById('discord-verify-btn');
            
            if (connectBtn) connectBtn.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'none';
            if (verifyBtn) {
                verifyBtn.innerHTML = '<span class="button-text">✓ Completed</span>';
                verifyBtn.disabled = true;
                verifyBtn.style.backgroundColor = '#10b981';
            }
            
            // Update task status
            completedTasks.discord = true;
            taskElement.classList.add('completed');
            updateProgress();
            saveTaskStates();
            
        } else {
            console.error('❌ Discord join verification failed:', data.error);
            
            if (data.needsSetup) {
                showNotification('Discord bot setup required. Please contact administrator.', 'error');
                if (verifyBtn) {
                    verifyBtn.innerHTML = '<span class="button-text">Setup Required</span>';
                    verifyBtn.disabled = true;
                    verifyBtn.style.backgroundColor = '#ef4444';
                }
            } else {
                showNotification(data.error || 'Failed to verify Discord join. Please try again.', 'error');
                if (verifyBtn) {
                    verifyBtn.innerHTML = '<span class="button-text">Verify Join</span>';
                    verifyBtn.disabled = false;
                }
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
