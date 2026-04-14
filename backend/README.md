# Backend - Loan Management System API

Node.js + Express.js backend for the Loan Management System, powered by Prisma ORM and Supabase PostgreSQL.

## Quick Start (Local Development)

### Prerequisites
- Node.js v20+ 
- npm or yarn
- Supabase project with PostgreSQL database

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your Supabase connection strings:
```
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

**Note:** Special characters in password must be URL encoded (e.g., `?` → `%3F`)

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:4000`.

### Verify Installation

```bash
# Test basic connectivity
curl http://localhost:4000/

# Test database connection
curl http://localhost:4000/test-db
```

## Vercel Deployment

See [../VERCEL_DEPLOYMENT.md](../VERCEL_DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow the prompts)
vercel --prod
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/change-password` - Change password

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Loans
- `GET /api/loans` - List loans
- `POST /api/loans` - Create loan
- `PUT /api/loans/:id/approve` - Approve loan
- `PUT /api/loans/:id/disburse` - Disburse loan
- `PUT /api/loans/:id/reject` - Reject loan

### Repayments
- `GET /api/loans/:loanId/repayments` - List repayments
- `POST /api/loans/:loanId/repay` - Record repayment

### Reports
- `GET /api/reports/aging` - Get aging report

### Users
- `GET /api/users` - List users
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset user password
- `DELETE /api/users/:id` - Delete user

### Audit
- `GET /api/audit-logs` - Get all audit logs

## Data Migration

### Export from Railway MySQL

```bash
npm run export:railway
```

Requires Railway environment variables:
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

### Full Migration (Export + Import)

```bash
MYSQL_HOST=caboose.proxy.rlwy.net \
MYSQL_PORT=27655 \
MYSQL_USER=root \
MYSQL_PASSWORD=your-password \
MYSQL_DATABASE=railway \
npm run migrate:railway
```

## Database Management

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Prisma CLI
```bash
# Open Prisma Studio
npx prisma studio

# Create migrations (development)
npx prisma migrate dev --name migration_name

# Push schema to database
npx prisma db push
```

## Project Structure

```
backend/
├── api/
│   └── [...all].js          # Vercel serverless endpoint
├── controllers/             # Route handlers
├── middleware/              # Auth middleware
├── routes/                  # Express routes
├── scripts/                 # Migration & export
├── utils/                   # Utility functions (hashing, audit)
├── prisma/
│   └── schema.prisma        # Database schema
├── app.js                   # Express app configuration
├── db.js                    # Prisma client setup
├── index.js                 # Local development entry point
├── package.json
├── vercel.json              # Vercel configuration
└── .env.example            # Environment variables template
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Supabase connection (pooling) |
| `DIRECT_URL` | Yes | Supabase connection (direct) |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `PORT` | No | Server port (default: 4000) |
| `NODE_ENV` | No | Environment (development/production) |

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Hosting**: Vercel (serverless)

## Troubleshooting

### Database connection fails
1. Verify `DATABASE_URL` and `DIRECT_URL` are correctly set
2. Check for special characters in password (must be URL encoded)
3. Ensure Supabase project is active
4. Test connection: `curl http://localhost:4000/test-db`

### Prisma client errors
```bash
npm run prisma:generate
```

### Dependencies issue
```bash
rm -rf node_modules package-lock.json
npm install
```

## Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with auto-reload
npm run prisma:generate # Generate Prisma client
npm run export:railway # Export data from Railway MySQL
npm run migrate:railway # Export from Railway and import to Supabase
```

## Security Notes

- All passwords are hashed with bcrypt
- JWT tokens are used for authentication
- CORS is configured to accept requests from specified frontend URL
- SQL injection is prevented by Prisma
- Environment variables should never be committed

## License

MIT
