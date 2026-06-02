# Backend Deployment to Render

## Step 1: Create Render Account

1. Go to https://render.com
2. Click "Get Started" or "Sign Up"
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

## Step 2: Connect GitHub Repository

1. On Render dashboard, click "New +"
2. Select "Web Service"
3. Click "Connect repository"
4. Find and select `PCP_BACKEND` repository
5. Click "Connect"

## Step 3: Configure Service

Fill in the following:

| Field | Value |
|-------|-------|
| **Name** | `pcp-backend` or `pcp-api` |
| **Environment** | Node |
| **Region** | Choose closest to you (US - Ohio recommended) |
| **Branch** | main |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

## Step 4: Add Environment Variables

Click "Advanced" → "Add Environment Variable"

Add each variable:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `MONGODB_URI` | Your connection string from MongoDB Atlas |
| `JWT_SECRET` | Create a strong secret key |
| `PRIVATE_API_URL` | (from assessment) |
| `PUBLIC_API_URL` | (from assessment) |
| `NODE_ENV` | `production` |

### Example MONGODB_URI:
```
mongodb+srv://admin:your_password@cluster-name.mongodb.net/pcp-tasks?retryWrites=true&w=majority
```

## Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-3 minutes)
3. You'll see logs in real-time
4. Once complete, you get a live URL: `https://pcp-backend-xxxx.onrender.com`

## Step 6: Verify Deployment

Test the health endpoint:

```bash
curl https://your-render-url/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running"
}
```

## Step 7: Update Frontend

Update frontend `.env.local`:

```env
VITE_API_BASE_URL=https://your-render-url.onrender.com
```

## Important Notes

### Free Tier Limitations
- ⏱️ Auto-spins down after 15 min of inactivity
- First request will take 30 seconds
- For production, upgrade to paid plan

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check `npm install` runs without errors |
| Connection timeout | Verify MongoDB IP whitelist includes Render IPs |
| Port error | Don't hardcode port 5000, use `process.env.PORT` |
| Routes 404 | Check routes are registered in `app.js` |

### Logs & Debugging

1. On Render dashboard, click your service
2. Go to "Logs" tab
3. View real-time logs
4. Look for errors and fix locally
5. Push changes to GitHub
6. Render auto-redeploys

## Redeploy After Changes

1. Make changes locally
2. Commit: `git add -A && git commit -m "message"`
3. Push: `git push`
4. Render auto-deploys (watch Logs tab)

## Deployment URL

Once deployed, save your URL:
```
https://pcp-backend-xxxx.onrender.com
```

You'll need this for:
- Frontend API calls
- Assessment submission
- Testing APIs
