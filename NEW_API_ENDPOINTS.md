# New API Endpoints for Sequential Task System

## 1. Add X to Existing Discord Session
**POST /api/link-twitter-to-session**

Request Body:
```json
{
  "discordUserId": "123456789",
  "twitterUserId": "987654321",
  "twitterUsername": "username",
  "twitterEmail": "email@example.com"
}
```

Logic:
1. Find user by discord_provider_id
2. Check if twitter_provider_id is already used in ANY account
3. If twitter already used → return error
4. If valid → update same UUID with twitter data

## 2. Add Wallet to Existing Session
**POST /api/link-wallet-to-session**

Request Body:
```json
{
  "discordUserId": "123456789",
  "walletAddress": "0x123..."
}
```

Logic:
1. Find user by discord_provider_id
2. Check if user has both discord AND twitter
3. Check if wallet is already used in ANY account
4. If wallet already used → return error
5. If valid → update same UUID with wallet data

## 3. Get Session by Discord ID
**GET /api/session/:discordUserId**

Returns:
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "discord_connected": true,
    "twitter_connected": true/false,
    "wallet_connected": true/false,
    "discord_joined": true/false,
    "tasks": {
      "discord": "completed",
      "twitter": "locked/unlocked/completed",
      "wallet": "locked/unlocked/completed"
    }
  }
}
```
