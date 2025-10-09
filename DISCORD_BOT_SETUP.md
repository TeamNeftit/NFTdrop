# Discord Bot Setup Guide

## 🚀 Complete Setup Instructions

### 1. Create Discord Bot Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Neftit NFT Drop Bot" (or any name you prefer)
4. Click "Create"

### 2. Get Bot Token

1. In your application, go to "Bot" section
2. Click "Add Bot" if not already added
3. Under "Token", click "Copy"
4. **IMPORTANT**: Keep this token secret!

### 3. Get Guild ID (Already Done ✅)

Your Guild ID: `1369232763709947914`

### 4. Add Bot to Your Discord Server

1. In Discord Developer Portal → Your Application → "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - `Read Messages`
   - `View Channels` 
   - `Read Message History`
   - `Send Messages` (optional)
4. Copy the generated URL
5. Open the URL in your browser
6. Select your Discord server (ID: 1369232763709947914)
7. Click "Authorize"

### 5. Update Your .env File

Create or update your `.env` file with:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_actual_bot_token_here
DISCORD_GUILD_ID=1369232763709947914

# Other existing variables...
X_CLIENT_ID=tODyYEPRkzeZA2vhnHvuSF6mc
X_CLIENT_SECRET=ZUczd4XcCNlDZ0tTokoeCrbdsEKeOAsnXPFpjNyutqK7h4s8VE
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
SUPABASE_URL=https://snkeusvyeztkpktxnxnr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua2V1c3Z5ZXp0a3BrdHhueG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzAxOTQsImV4cCI6MjA3NTUwNjE5NH0._c2BVeVz6NlrIfvjGTVsQLh1mfleq0QAu0kJPKrpALo
```

### 6. Test the Setup

1. Restart your server: `node server.js`
2. Test bot access: `http://localhost:3000/api/debug/test-discord-bot`
3. Should return: `{"success": true, "guild": {...}}`

### 7. Test Full Flow

1. Open your app: `http://localhost:3000`
2. Connect Discord
3. Click "Join Discord Server" 
4. Join your Discord server
5. Click "Verify Join"
6. Should verify successfully!

## 🔧 Troubleshooting

### "Unknown Guild" Error
- Bot is not added to your Discord server
- Guild ID is incorrect
- **Solution**: Add bot to server using OAuth2 URL

### "Bot permission error" 
- Bot doesn't have required permissions
- **Solution**: Re-add bot with proper permissions

### "Bot not configured"
- Bot token is not set in .env file
- **Solution**: Add DISCORD_BOT_TOKEN to .env file

## ✅ Verification

Once setup is complete, the Discord verification will:
1. ✅ Check if user is actually in your Discord server
2. ✅ Update database with join status
3. ✅ Mark Discord task as completed
4. ✅ No more hardcoded verification!

## 🎯 Discord Invite Link

Your Discord invite: `https://discord.com/invite/Xc54PrHv7w`

This is already configured in the app and will open when users click "Join Discord Server".
