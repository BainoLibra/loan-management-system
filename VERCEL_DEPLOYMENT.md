# Vercel Deployment Guide

This document provides step-by-step instructions for deploying the Loan Management System to Vercel.

## Project Structure for Vercel

```
loan-management-system/
├── backend/              (Deploy as separate Vercel project)
│   ├── api/[...all].js  (Serverless entry point)
│   ├── app.js           (Express app)
│   ├── vercel.json      (Vercel configuration)
│   └── ...
├── frontend/            (Deploy as separate Vercel project)
│   ├── src/
│   ├── vercel.json      (Vercel configuration)
│   └── ...
```

## Prerequisites

- GitHub account with the repository pushed
- Vercel account (https://vercel.com)
- Supabase project with PostgreSQL database
- Environment variables ready (see below)

## Step 1: Prepare Supabase Database

1. Create a Supabase project at https://app.supabase.com
2. Go to **Settings > Database**
3. Copy the connection strings:
   - **DATABASE_URL** (Connection pooling, port 6543 for serverless)
   - **DIRECT_URL** (Direct connection, port 5432 for migrations)
4. Note: If password contains special characters, they must be URL encoded (e.g., `?` → `%3F`)

Example connection strings:
```
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

## Step 2: Deploy Backend to Vercel

### Option A: From GitHub (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New" > "Project"**
3. Select your GitHub repository
4. Choose the `backend` directory as the root
5. Add Environment Variables:
   - `DATABASE_URL`: Copy from Supabase
   - `DIRECT_URL`: Copy from Supabase
   - `JWT_SECRET`: Generate a secure random string (e.g., `openssl rand -base64 32`)
   - `FRONTEND_URL`: Your frontend Vercel URL (can set this later)
   - `NODE_ENV`: `production`
6. Click **Deploy**
7. Note the deployed URL (e.g., `https://your-backend.vercel.app`)

### Option B: Using Vercel CLI

```bash
cd backend
vercel --prod
```

Then follow the prompts to set environment variables.

## Step 3: Deploy Frontend to Vercel

### Option A: From GitHub (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New" > "Project"**
3. Select your GitHub repository
4. Choose the `frontend` directory as the root
5. Add Environment Variables:
   - `REACT_APP_API_URL`: Set to your backend Vercel URL from Step 2
   - Example: `https://your-backend.vercel.app`
6. Click **Deploy**
7. Note the deployed URL (e.g., `https://your-frontend.vercel.app`)

### Option B: Using Vercel CLI

```bash
cd frontend
vercel --prod
```

When prompted for `REACT_APP_API_URL`, enter the backend URL from Step 2.

## Step 4: Update Backend FRONTEND_URL

1. Go to your backend project on Vercel dashboard
2. Go to **Settings > Environment Variables**
3. Update `FRONTEND_URL` with your frontend Vercel URL
4. Click **Redeploy** to apply changes

## Step 5: Verify Deployment

### Test Backend
```bash
curl https://your-backend.vercel.app/health
# Should return: Server working

curl https://your-backend.vercel.app/test-db
# Should return: { "message": "DB connected" }
```

### Test Frontend
1. Open `https://your-frontend.vercel.app`
2. Try logging in with test credentials:
   - Email: `admin@example.com` (auto-seeded)
   - Password: `admin`
3. Verify that dashboard loads and API calls work

## Environment Variables Reference

### Backend (Vercel > Settings > Environment Variables)

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Supabase Settings | `postgresql://postgres.xxx...` |
| `DIRECT_URL` | Supabase Settings | `postgresql://postgres.xxx...` |
| `JWT_SECRET` | Generate new | `uJzK9pL2mNqR3sT5vW7xY9z0` |
| `FRONTEND_URL` | Your frontend URL | `https://your-frontend.vercel.app` |
| `NODE_ENV` | Always production | `production` |

### Frontend (Vercel > Settings > Environment Variables)

| Variable | Source | Example |
|----------|--------|---------|
| `REACT_APP_API_URL` | Backend URL | `https://your-backend.vercel.app` |

## Troubleshooting

### 502 Bad Gateway
- Check that DATABASE_URL and DIRECT_URL are correct in Vercel
- Verify Supabase connection is working
- Check Vercel function logs (Vercel > Deployments > Logs)

### Database Connection Fails
- Verify DATABASE_URL/DIRECT_URL are correct and URL-encoded
- Check that Supabase project is active
- Verify firewall rules allow Vercel's IP ranges

### Frontend Can't Reach Backend
- Verify REACT_APP_API_URL is set correctly
- Check browser DevTools Network tab to see API calls
- Confirm CORS is enabled on backend (already configured)

### 404 on Frontend Pages After Deploy
- Vercel rewrites are configured in `vercel.json`
- Hard refresh browser (Ctrl+Shift+R)
- Check that frontend framework is "create-react-app" in Vercel settings

## Monitoring & Logs

- **Backend**: Vercel Dashboard > Deployment > Functions > Logs
- **Frontend**: Vercel Dashboard > Deployment > Production Logs
- **Database**: Supabase Dashboard > Database > Logs

## Updating Code

Changes are automatically deployed when you push to GitHub:

1. Make changes locally
2. Commit: `git commit -m "your message"`
3. Push: `git push origin main`
4. Vercel automatically redeploys on push to main branch

## Security Notes

- Never commit `.env` files with real secrets
- Rotate JWT_SECRET periodically
- Use strong passwords for Supabase
- Enable 2FA on both GitHub and Vercel accounts
- Regularly update dependencies: `npm audit` and `npm update`

## Support

For issues, check:
- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Express.js Guide: https://expressjs.com/guide
- React Deployment: https://create-react-app.dev/deployment/vercel/
