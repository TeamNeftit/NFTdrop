const fs = require('fs');
const path = require('path');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📁 Found existing .env file');
} catch (error) {
    console.log('📁 No .env file found, creating new one...');
    envContent = `# X (Twitter) OAuth2 Configuration
X_CLIENT_ID=tODyYEPRkzeZA2vhnHvuSF6mc
X_CLIENT_SECRET=ZUczd4XcCNlDZ0tTokoeCrbdsEKeOAsnXPFpjNyutqK7h4s8VE
X_REDIRECT_URI=http://localhost:3000/auth/x/callback
NEFTIT_X_USERNAME=neftitxyz

# Discord OAuth2 Configuration
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_GUILD_ID=1369232763709947914
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://snkeusvyeztkpktxnxnr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua2V1c3Z5ZXp0a3BrdHhueG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzAxOTQsImV4cCI6MjA3NTUwNjE5NH0._c2BVeVz6NlrIfvjGTVsQLh1mfleq0QAu0kJPKrpALo
`;
}

// Update the guild ID
envContent = envContent.replace(
    /DISCORD_GUILD_ID=.*/,
    'DISCORD_GUILD_ID=1369232763709947914'
);

// Write updated .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ Updated .env file with Discord Guild ID: 1369232763709947914');
console.log('📝 Next step: Add your Discord bot token to DISCORD_BOT_TOKEN in the .env file');
console.log('📖 See DISCORD_BOT_SETUP.md for complete instructions');
