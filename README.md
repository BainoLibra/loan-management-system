# Loan Management System

A comprehensive role-based loan management system built with Node.js and Express on the backend, designed to manage loan applications, approvals, disbursements, and repayments with JWT-based authentication.

## Overview

This system provides full functionality for:
- **User Authentication**: JWT-based token authentication with role-based access control (Admin, Loan Officer, Cashier, Client)
- **Client Management**: Create and manage loan clients with detailed information
- **Loan Management**: Apply for loans, approve/reject applications, disburse funds, and track loan status
- **Repayment Tracking**: Record, track, and manage loan repayments
- **Loan Status Tracking**: Monitor loans through multiple statuses (Applied → Approved → Disbursed → Closed)
- **Audit Logging**: Track all user actions for compliance and auditing
- **Reporting**: Generate aging reports for loan portfolio analysis
- **Role-Based Access Control**: Granular permission management based on user roles

## Tech Stack

- **Backend**: Node.js with Express.js framework
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT (JSON Web Tokens) for secure API access
- **API**: RESTful API with full CORS support
- **Development**: Nodemon for hot-reloading during development
- **Middleware**: Body-Parser for JSON request handling and custom authentication middleware

## Project Structure

```
loan-management-system/
├── README.md
├── backend/
│   ├── index.js                 # Main Express server entry point
│   ├── db.js                    # MySQL database connection and table initialization
│   ├── package.json             # Backend dependencies and scripts
│   ├── controllers/
│   │   ├── auditController.js   # Audit log management
│   │   ├── authController.js    # Authentication and user management
│   │   ├── clientController.js  # Client management operations
│   │   ├── loanController.js    # Loan application and management
│   │   ├── repaymentController.js # Repayment tracking
│   │   └── reportController.js  # Reporting functionality
│   ├── middleware/
│   │   └── auth.js              # JWT authentication and role authorization middleware
│   ├── routes/
│   │   ├── auditRoutes.js       # Audit log API routes
│   │   ├── authRoutes.js        # Authentication API routes
│   │   ├── clientRoutes.js      # Client management API routes
│   │   ├── loanRoutes.js        # Loan management API routes
│   │   ├── repaymentRoutes.js   # Repayment API routes
│   │   └── reportRoutes.js      # Report API routes
│   └── utils/
│       └── hash.js              # Password hashing utilities
```

## Backend Setup

### Prerequisites
- Node.js v14 or higher
- MySQL Server (local or remote)
- npm or yarn package manager

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install all dependencies:
```bash
npm install
```

This will install:
- `express` - Web framework
- `body-parser` - JSON request parsing
- `cors` - Cross-Origin Resource Sharing support
- `mysql2` - MySQL database driver
- `jsonwebtoken` - JWT token generation and verification
- `bcrypt` - Password hashing
- `nodemon` - Development auto-reload (dev dependency)

3. **Configure your database connection** in `db.js`:
```javascript
const pool = mysql.createPool({
  host: 'localhost',      // Your MySQL host
  user: 'root',           // Your MySQL user
  password: '',           // Your MySQL password
  database: 'loan_management',  // Your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

4. (Optional) Create a `.env` file for environment variables:
```bash
MYSQL_HOST=127.0.0.1
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=loan_management
PORT=4000
JWT_SECRET=mysecretkey
```

### Database Setup

1. Create a MySQL database named `loan_management` (or update the database name in your configuration).

2. The application will automatically create the required tables and seed an admin user on first run:
   - **Admin User**: email: `admin@example.com`, password: `admin`

### Running the Server

**Development mode** (with hot-reload):
```bash
npm run dev
```

This will run `nodemon` against the main entry point `index.js`.

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:4000` by default, or whatever is defined in the `PORT` environment variable.

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user (Admin only)
  - Request: `{ "name": "John Doe", "email": "john@example.com", "password": "password", "role": "client" }`
  - Response: `{ "message": "User registered successfully" }`
- `POST /api/auth/login` - Login with email and password, receive JWT token
  - Request: `{ "email": "user@example.com", "password": "password" }`
  - Response: `{ "token": "eyJhbGc...", "user": { "id": 1, "name": "John", "email": "user@example.com", "role": "client" } }`

### Protected Endpoints
All endpoints below require JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Clients
- `GET /api/clients` - Get all clients (Admin, Loan Officer)
- `POST /api/clients` - Create a new client (Admin, Loan Officer)
  - Request: `{ "name": "John Doe", "phone": "123-456-7890", "email": "john@example.com", "identifier": "ID123" }`

### Loans
- `GET /api/loans` - Get all loans (Admin, Loan Officer) or client's own loans (Client)
- `POST /api/loans` - Apply for a new loan (Admin, Loan Officer)
  - Request: `{ "clientId": 1, "amount": 10000, "interestRate": 5.5, "termMonths": 12 }`
- `POST /api/loans/:id/approve` - Approve loan application (Admin)
- `POST /api/loans/:id/disburse` - Disburse approved loan funds (Admin, Cashier)
- `POST /api/loans/:id/repay` - Record a loan repayment (Admin, Cashier)
  - Request: `{ "amount": 1000 }`
- `GET /api/loans/:id/repayments` - Get repayments for a specific loan (Admin, Loan Officer, Cashier)
- `DELETE /api/loans/:id` - Delete a loan (Admin) - only if not disbursed

### Repayments
- `GET /api/loans/:id/repayments` - Get repayments for a specific loan (Admin, Loan Officer, Cashier)

### Audit Logs
- `GET /api/audit-logs` - Get all audit logs (Admin)

### Reports
- `GET /api/reports/aging` - Get loan aging report with PAR buckets (Admin, Cashier, Loan Officer)

## Database Schema

The system uses the following tables:

**users** - User accounts with authentication
- `id` (INT, Primary Key, Auto Increment)
- `name` (VARCHAR(255))
- `email` (VARCHAR(255), Unique)
- `password` (VARCHAR(255)) - Bcrypt hashed
- `role` (ENUM: admin, loan_officer, cashier, client)

**clients** - Client information
- `id` (INT, Primary Key, Auto Increment)
- `name` (VARCHAR(255))
- `phone` (VARCHAR(50))
- `email` (VARCHAR(255))
- `identifier` (VARCHAR(255))

**loans** - Loan applications and records
- `id` (INT, Primary Key, Auto Increment)
- `clientId` (INT, Foreign Key to clients.id)
- `amount` (DOUBLE)
- `interestRate` (DOUBLE)
- `termMonths` (INT)
- `status` (VARCHAR(50): applied, approved, disbursed, closed)
- `appliedAt` (DATETIME)
- `approvedBy` (INT, Foreign Key to users.id, Nullable)
- `approvedAt` (DATETIME, Nullable)
- `disbursedAt` (DATETIME, Nullable)
- `balance` (DOUBLE)
- `createdBy` (INT, Foreign Key to users.id)

**repayments** - Repayment records
- `id` (INT, Primary Key, Auto Increment)
- `loanId` (INT, Foreign Key to loans.id)
- `amount` (DOUBLE)
- `date` (DATETIME)
- `paidBy` (INT, Foreign Key to users.id)

**audit_logs** - Audit trail for user actions
- `id` (INT, Primary Key, Auto Increment)
- `userId` (INT, Foreign Key to users.id)
- `action` (VARCHAR(255))
- `entity` (VARCHAR(255))
- `entityId` (INT)
- `createdAt` (TIMESTAMP)

## Development Notes

- **Authentication**: JWT tokens expire after 24 hours. Clients must include the token in the `Authorization` header for all protected endpoints
- **Role-Based Access**:
  - `admin` - Full system access including user registration, loan approval, audit logs
  - `loan_officer` - Can create clients and loans, view reports
  - `cashier` - Can disburse loans and record repayments
  - `client` - Can view own loan information (not implemented in current API)
- **Seed Data**: Initialize with default admin user (email: `admin@example.com`, password: `admin`) on first database setup
- **Error Handling**: All endpoints return appropriate HTTP status codes with detailed error messages in JSON format
- **CORS Support**: API is configured with CORS enabled for cross-origin requests
- **Audit Logging**: All major actions are logged to audit_logs table for compliance
- **Reports**: Aging report categorizes loans into PAR buckets (Current, PAR 30, PAR 60, PAR 90)

## Future Enhancements

- [ ] Password hashing improvements (currently using bcrypt)
- [ ] Email notifications for loan status updates
- [ ] PDF report generation for loan documents
- [ ] Frontend application (React/Vue)
- [ ] Advanced analytics and reporting dashboard
- [ ] Loan rejection functionality
- [ ] Client-specific loan viewing for client role
- [ ] Database migration scripts
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Input validation and sanitization middleware
- [ ] SMS notifications for repayment reminders
- [ ] Integration with payment gateways
