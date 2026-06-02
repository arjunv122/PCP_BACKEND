# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up"
3. Enter your email and create password
4. Verify your email
5. Log in to your account

## Step 2: Create a Cluster

1. Click "Create" on the dashboard
2. Choose **Free Tier** (M0)
3. Select your provider (AWS recommended)
4. Choose region closest to you
5. Click "Create Cluster" (takes 1-3 minutes)

## Step 3: Create Database User

1. Go to "Security" → "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username: `admin` (or any name)
5. Enter password: (create a strong password)
6. Set User Privileges: "Atlas Admin"
7. Click "Add User"
8. **Save credentials** - you'll need them

## Step 4: Whitelist IP Address

1. Go to "Security" → "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
   - Or add your IP: click "Add Current IP Address"
4. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Databases" → your cluster
2. Click "Connect"
3. Choose "Connect your application"
4. Select **Node.js** driver
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<username>` with your database user username

### Connection String Format:
```
mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
```

## Step 6: Add to Backend .env

Create `.env` file in backend root:

```env
PORT=5000
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster-name.mongodb.net/pcp-tasks?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_change_this
PRIVATE_API_URL=https://api.example.com/private
PUBLIC_API_URL=https://api.example.com/public
```

## Testing Connection

In your backend terminal:
```bash
npm run dev
```

You should see:
```
MongoDB connected successfully
Server running on port 5000
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection timeout | Check IP whitelist in Network Access |
| Auth failed | Verify username/password in connection string |
| Database not found | MongoDB will create it automatically |
| Wrong region | Check your cluster's region matches |

## Security Notes

⚠️ **Never commit .env file to GitHub**
- Add `.env` to `.gitignore` (already done)
- Use `.env.example` for reference
- Use strong passwords for production

## Next Steps

Once connected:
1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Test APIs with Postman
