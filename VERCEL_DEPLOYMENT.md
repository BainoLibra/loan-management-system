# Vercel Deployment Guide

This document provides step-by-step instructions for deploying the Loan Management System to Vercel.

## Project Structure for Vercel

```
loan-management-system/
├── backend/
│   ├── api/[...all].js  (Serverless entry point)
│   ├── app.js           (Express app)
│   ├── vercel.json      (Optional backend-only config)
│   └── ...
├── frontend/
│   ├── src/
│   ├── vercel.json      (Optional frontend-only config)
│   └── ...
├── vercel.json          (Root config for single-project deploy)
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

## Step 2: Deploy Single Project to Vercel

### Option A: From GitHub (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New" > "Project"**
3. Select your GitHub repository
4. Keep root directory as `./` (repository root)
5. Add Environment Variables:
   - `DATABASE_URL`: Copy from Supabase
   - `DIRECT_URL`: Copy from Supabase
   - `JWT_SECRET`: Generate a secure random string (e.g., `openssl rand -base64 32`)
   - `FRONTEND_URL`: Your project URL (e.g., `https://your-project.vercel.app`)
   - `NODE_ENV`: `production`
6. Click **Deploy**
7. Note the deployed URL (e.g., `https://your-project.vercel.app`)

### Option B: Using Vercel CLI

```bash
cd loan-management-system
vercel --prod
```

Then follow the prompts to set environment variables.

## Step 3: Verify Deployment

### Test API and backend health
```bash
curl https://your-project.vercel.app/health
# Should return: Server working

curl https://your-project.vercel.app/test-db
# Should return: { "message": "DB connected" }
```

### Test Frontend
1. Open `https://your-project.vercel.app`
2. Try logging in with test credentials:
   - Email: `admin@example.com` (auto-seeded)
   - Password: `admin`
3. Verify that dashboard loads and API calls work

## Environment Variables Reference

### Project-level (Vercel > Settings > Environment Variables)

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Supabase Settings | `postgresql://postgres.xxx...` |
| `DIRECT_URL` | Supabase Settings | `postgresql://postgres.xxx...` |
| `JWT_SECRET` | Generate new | `uJzK9pL2mNqR3sT5vW7xY9z0` |
| `FRONTEND_URL` | Same project URL | `https://your-project.vercel.app` |
| `NODE_ENV` | Always production | `production` |

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
- Verify `vercel.json` routes include `/api/(.*)` -> `/backend/api/[...all].js`
- Check browser DevTools Network tab to see API calls
- Confirm CORS FRONTEND_URL matches your deployed domain

### 404 on Frontend Pages After Deploy
- Ensure root `vercel.json` exists in repository root
- Verify Vercel project Root Directory is `./`
- Vercel rewrites are configured in root `vercel.json`
- Hard refresh browser (Ctrl+Shift+R)

## Monitoring & Logs

- **Functions**: Vercel Dashboard > Deployment > Functions > Logs
- **Frontend build**: Vercel Dashboard > Deployment > Build Logs
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
