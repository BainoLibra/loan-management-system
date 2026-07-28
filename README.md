# Loan Management System

Role-based loan management platform with a Node.js/Express backend and React frontend.

## What It Does

- User authentication and role-based access (admin, loan_officer, cashier, client)
- Client registration and management
- Loan lifecycle management: apply, approve/reject, disburse, repay
- Repayment tracking
- Audit logs for key actions
- Aging report for portfolio monitoring

## Tech Stack

- Backend: Node.js, Express, Prisma
- Frontend: React (Create React App)
- Database: Supabase PostgreSQL
- Auth: JWT
- Deployment: Vercel (single project serving frontend and backend)

## Repository Structure

```text
loan-management-system/
|-- backend/
|   |-- api/[...all].js
|   |-- app.js
|   |-- db.js
|   |-- index.js
|   |-- prisma/schema.prisma
|   |-- controllers/
|   |-- routes/
|   |-- middleware/
|   |-- utils/
|   `-- vercel.json
|-- frontend/
|   |-- src/
|   |-- public/
|   `-- vercel.json
|-- VERCEL_DEPLOYMENT.md
`-- README.md
```

## Local Development

### 1) Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and set:

```dotenv
DATABASE_URL=postgresql://postgres.lujvlbvpbzkqejdvzcel:hqoC7NML7B5qFVRK@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.lujvlbvpbzkqejdvzcel:hqoC7NML7B5qFVRK@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
PORT=4000
JWT_SECRET=super_secret_local_key_84y839hf8
FRONTEND_URL=http://localhost:3000
SEED_DEFAULT_ADMIN=true
```

**Important:** Before starting the backend for the first time, you must push the database schema to Supabase to create the tables:
```bash
npx prisma db push --accept-data-loss
```

Run backend:

```bash
npm run dev
```

Backend health checks:

- `GET /`
- `GET /health`
- `GET /test-db`

### 2) Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:4000
```

Run frontend:

```bash
npm start
```

Open `http://localhost:3000`.

## Vercel Deployment & Supabase Connection (Recommended Setup)

To deploy this project to Vercel and connect it to your live Supabase database, follow these steps:

### 1) Authenticate with Vercel and Supabase

First, ensure you are logged into the correct accounts via the CLI:
```bash
# Log in to Vercel (if you need to switch accounts, run `vercel logout` first)
vercel login

# Log in to Supabase CLI
supabase login
```

### 2) Link the Project

Link your local repository to the Vercel project and the Supabase project:
```bash
# Link to Vercel
vercel link

# Link to Supabase
supabase link --project-ref lujvlbvpbzkqejdvzcel
```

### 3) Set Up Environment Variables

Your Vercel deployment requires the Supabase connection strings to talk to the database. You can add them via the Vercel CLI or Dashboard.

If using the CLI, run the following commands and paste the respective values when prompted:
```bash
vercel env add DATABASE_URL production
# Value: postgresql://postgres.lujvlbvpbzkqejdvzcel:hqoC7NML7B5qFVRK@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

vercel env add DIRECT_URL production
# Value: postgresql://postgres.lujvlbvpbzkqejdvzcel:hqoC7NML7B5qFVRK@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

vercel env add JWT_SECRET production
# Value: r4nd0m_s3cr3t_f0r_pr0duct10n_9x8

vercel env add FRONTEND_URL production
# Value: https://libra1.healthlinks.ug
```

### 3.1) Push Database Schema

If this is your first time deploying to a fresh database, make sure to push the schema from your local environment to the remote database so that the tables are created (and the `ready` state is successful when Vercel boots up):
```bash
cd backend
npx prisma db push --accept-data-loss
```

### 4) Deploy

Once the environment variables are set, deploy your code:
```bash
vercel deploy --prod
```

Your frontend will automatically route API requests to the backend using the `vercel.json` configuration, and the backend will securely connect to Supabase!

## API Summary

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/change-password`

### Clients
- `GET /api/clients`
- `GET /api/clients/:id`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

### Loans
- `GET /api/loans`
- `POST /api/loans`
- `POST /api/loans/:id/approve`
- `POST /api/loans/:id/reject`
- `POST /api/loans/:id/disburse`
- `GET /api/loans/:id/schedule`

### Repayments
- `POST /api/loans/:loanId/repay`
- `GET /api/loans/:loanId`

### Reports and Audit
- `GET /api/reports/aging`
- `GET /api/audit-logs`

### Users
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `POST /api/users/:id/reset-password`
- `DELETE /api/users/:id`

## Default Admin Seeding

If `SEED_DEFAULT_ADMIN` is not set to `false`, the backend seeds a default admin user when the users table is empty:

- Email: `admin@example.com`
- Password: `admin`

Change this password immediately in non-local environments.

## Notes

- Frontend requests use `REACT_APP_API_URL` as base URL.
- Backend CORS allows the single origin in `FRONTEND_URL` with credentials enabled.
- Prisma is configured for PostgreSQL via Supabase connection strings.

## Troubleshooting Common Errors

### 1. `MODULE_NOT_FOUND` for `.prisma/client/default`

**Symptom:** During deployment or when running the server, the app crashes with an error stating `Cannot find module '.prisma/client/default'`.

**Cause:** The Prisma Client has not been generated for your environment. Starting from Prisma 7, relying purely on default generation scripts can sometimes fail in environments using `--ignore-scripts` or custom module loaders.

**Fix:** Ensure your `package.json` contains a `postinstall` script to explicitly generate the client:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```
If developing locally, simply run `npx prisma generate` in the `backend/` folder.

### 2. `503 Service Unavailable` on Vercel Serverless Functions

**Symptom:** API endpoints like `/api/auth/login` return a `503` error despite environment variables being correctly configured and the database being reachable locally.

**Cause:** Vercel serverless functions implement warm-start caching. If the app boots up and fails to connect to the database (e.g., because environment variables were wrong or the database was paused), Vercel caches that "failed" state across the container lifecycle. Updating environment variables via the Vercel Dashboard does not always flush the runtime cache for already-deployed functions.

**Fix:** You must trigger a **completely fresh production deployment** to clear the serverless cache and force Vercel to rebuild and reconnect to the database using the new credentials:
```bash
vercel deploy --prod
```
If the issue persists, perform a hard refresh (`Ctrl + F5`) in your browser to clear local client caches.
