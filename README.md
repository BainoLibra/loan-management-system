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
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
PORT=4000
JWT_SECRET=your_strong_secret
FRONTEND_URL=http://localhost:3000
SEED_DEFAULT_ADMIN=true
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

## Vercel Deployment (Current Recommended Setup)

Deploy as **one Vercel project from repository root**:

1. Create a Vercel project from this repository.
2. Set Root Directory to `./`.
3. Use the root `vercel.json` in this repository.
4. Add required environment variables:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL` (set to your project URL, e.g. `https://your-project.vercel.app`)
  - `NODE_ENV=production`

Frontend will call backend APIs on the same domain using `/api/*` in production by default.

Detailed steps: see `VERCEL_DEPLOYMENT.md`.

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
