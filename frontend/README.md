# Frontend - Loan Management System

React frontend for the Loan Management System.

## Quick Start

### Prerequisites
- Node.js v18+
- npm
- Backend running at `http://localhost:4000` for local development

### Install

```bash
npm install
```

### Run (Development)

```bash
npm start
```

App opens at `http://localhost:3000`.

### Build (Production)

```bash
npm run build
```

## Environment Variables

Create `frontend/.env` for local development:

```dotenv
REACT_APP_API_URL=http://localhost:4000
```

Production behavior:
- In production, frontend defaults to same-origin API calls (`/api/*`).
- `REACT_APP_API_URL` is mainly for development/local overrides.

## Deployment

The project is deployed as a **single Vercel project from repository root**.

- Root config: `../vercel.json`
- Frontend output directory: `frontend/build`
- API requests: routed by Vercel from `/api/*` to backend function

For full deployment steps, see `../VERCEL_DEPLOYMENT.md`.

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build production assets
- `npm test` - Run tests

## Test Credentials

If backend auto-seeding is enabled:

```text
Email: admin@example.com
Password: admin
```

## Tech Notes

- React + React Router
- Service layer under `src/services/`
- Uses cookie-enabled requests (`credentials: include`) for auth/session flows
