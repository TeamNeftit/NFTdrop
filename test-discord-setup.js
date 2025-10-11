const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Discord Bot Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Please copy env.example to .env and add your real values');
    process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');
console.log('✅ .env file found');

// Check for Discord bot token
const botTokenMatch = envContent.match(/DISCORD_BOT_TOKEN=(.+)/);
if (!botTokenMatch || botTokenMatch[1] === 'your_discord_bot_token_here') {
    console.log('❌ DISCORD_BOT_TOKEN not set or still using placeholder');
    console.log('📝 Please set your real Discord bot token in .env file');
} else {
    console.log('✅ DISCORD_BOT_TOKEN is set');
}

// Check for Discord guild ID
const guildIdMatch = envContent.match(/DISCORD_GUILD_ID=(.+)/);
if (!guildIdMatch || guildIdMatch[1] === 'your_discord_guild_id_here') {
    console.log('❌ DISCORD_GUILD_ID not set or still using placeholder');
    console.log('📝 Please set your real Discord guild ID in .env file');
} else {
    console.log('✅ DISCORD_GUILD_ID is set:', guildIdMatch[1]);
}

// Check for Discord invite link
const inviteMatch = envContent.match(/DISCORD_INVITE_LINK=(.+)/);
if (!inviteMatch || inviteMatch[1] === 'https://discord.com/invite/your_invite_code_here') {
    console.log('❌ DISCORD_INVITE_LINK not set or still using placeholder');
    console.log('📝 Please set your real Discord invite link in .env file');
} else {
    console.log('✅ DISCORD_INVITE_LINK is set:', inviteMatch[1]);
}

console.log('\n🔧 To fix Discord detection:');
console.log('1. Get your Discord bot token from Discord Developer Portal');
console.log('2. Add it to .env file: DISCORD_BOT_TOKEN=your_actual_token');
console.log('3. Add your Discord invite link: DISCORD_INVITE_LINK=https://discord.com/invite/your_code');
console.log('4. Restart the server: node server.js');
console.log('5. Test: curl http://localhost:3000/api/debug/test-discord-bot');
