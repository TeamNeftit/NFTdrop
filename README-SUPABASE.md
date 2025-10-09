# Supabase Database Setup

This document explains how to set up Supabase for the Neftit NFT drop project.

## 🗄️ **Database Schema**

The database includes three main tables:

### **1. Users Table**
Stores user authentication data from X and Discord:
- `user_id` - Platform-specific user ID
- `platform` - 'x' or 'discord'
- `username` - Platform username
- `display_name` - User's display name
- `profile_image_url` - Profile picture URL
- `followed_neftit` - Boolean if user followed Neftit on X
- `joined_discord` - Boolean if user joined Discord server
- `evm_address` - User's wallet address
- `created_at` / `updated_at` - Timestamps

### **2. Task Completions Table**
Tracks individual task completions:
- `user_id` / `platform` - User identification
- `task_type` - 'follow_x', 'join_discord', 'evm_address'
- `completed_at` - When task was completed
- `metadata` - Additional task-specific data (JSON)

### **3. NFT Eligibility Table**
Tracks NFT drop eligibility:
- `user_id` / `platform` - User identification
- `is_eligible` - Boolean eligibility status
- `tasks_completed` - Number of completed tasks
- `total_tasks` - Total required tasks (3)
- `eligibility_checked_at` - Last eligibility check

## 🚀 **Setup Instructions**

### **1. Create Supabase Project**
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### **2. Run Database Schema**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create tables and functions

### **3. Configure Environment**
1. Copy `env.example` to `.env`
2. Add your Supabase credentials:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### **4. Test Database Connection**
```bash
npm start
```

Check the server logs for "User data saved to Supabase" messages.

## 📊 **API Endpoints**

### **Get All Users**
```
GET /api/users
```

### **Get User by ID**
```
GET /api/users/:userId
```

### **Get Statistics**
```
GET /api/stats
```
Returns:
- Total users
- X users count
- Discord users count
- Followed Neftit count
- Joined Discord count

## 🔍 **Database Features**

### **Automatic Eligibility Tracking**
- Triggers automatically update eligibility when tasks are completed
- Users become eligible when all 3 tasks are completed
- Real-time eligibility status updates

### **User Statistics View**
- Pre-built view for dashboard statistics
- Real-time counts of users and completions
- Easy integration with admin dashboards

### **Data Integrity**
- Unique constraints prevent duplicate users
- Foreign key relationships maintain data consistency
- Automatic timestamp updates

## 🛠️ **Development**

### **Local Development**
```bash
npm install
npm start
```

### **Database Queries**
You can query the database directly in Supabase SQL Editor:

```sql
-- Get all eligible users
SELECT * FROM nft_eligibility WHERE is_eligible = true;

-- Get user statistics
SELECT * FROM user_stats;

-- Get recent users
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

## 🔐 **Security**

- Row Level Security (RLS) can be enabled
- API keys are environment variables
- User data is encrypted in transit
- No sensitive data stored in plain text

## 📈 **Monitoring**

The database automatically tracks:
- User registrations
- Task completions
- Eligibility status
- Platform distribution
- Completion rates

Use the `/api/stats` endpoint to monitor project progress!
