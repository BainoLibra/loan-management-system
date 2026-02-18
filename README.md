# Loan Management System

A comprehensive role-based loan management system built with Node.js and Express on the backend, designed to manage loan applications, approvals, disbursements, and repayments with JWT-based authentication.

## Overview

This system provides full functionality for:
- **User Authentication**: JWT-based token authentication with role-based access control (Admin, Staff, Client)
- **Client Management**: Create and manage loan clients with detailed information
- **Loan Management**: Apply for loans, approve/reject applications, disburse funds, and track loan status
- **Repayment Tracking**: Record, track, and manage loan repayments
- **Loan Status Tracking**: Monitor loans through multiple statuses (Applied → Approved/Rejected → Disbursed → Repaid)
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
├── backend/
│   ├── index.js              # Express server and API endpoints
│   ├── db.js                 # MySQL connection pool initialization
│   ├── package.json          # Backend dependencies and scripts
│   ├── middleware/
│   │   └── auth.js           # JWT authentication and role authorization
│   └── .env                  # Environment variables (optional)
└── README.md
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

### Running the Server

**Development mode** (with hot-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:4000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password, receive JWT token
  - Request: `{ "email": "user@example.com", "password": "password" }`
  - Response: `{ "token": "eyJhbGc...", "user": { "id": 1, "name": "John", "email": "user@example.com", "role": "client" } }`

### Protected Endpoints
All endpoints below require JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Clients
- `GET /api/clients` - Get all clients (Protected)
- `POST /api/clients` - Create a new client (Admin/Staff)
- `GET /api/clients/:id` - Get specific client details (Protected)
- `PUT /api/clients/:id` - Update client information (Admin/Staff)

### Loans
- `GET /api/loans` - Get all loans (Protected)
- `POST /api/loans` - Apply for a new loan (Client)
- `GET /api/loans/:id` - Get loan details and history (Protected)
- `PUT /api/loans/:id/approve` - Approve loan application (Admin/Staff)
- `PUT /api/loans/:id/disburse` - Disburse approved loan funds (Admin/Staff)
- `PUT /api/loans/:id/reject` - Reject a loan application (Admin/Staff)

### Repayments
- `GET /api/repayments/loan/:loanId` - Get repayments for a specific loan (Protected)
- `POST /api/repayments` - Record a new repayment (Staff/Client)
- `GET /api/repayments` - Get all repayments (Admin/Staff)

## Database Schema

The system uses the following tables:

**users** - User accounts with authentication
- `id` (INT, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR) - Hashed in production
- `role` (ENUM: admin, staff, client)
- `created_at` (TIMESTAMP)

**clients** - Client information
- `id` (INT, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR)
- `phone` (VARCHAR)
- `address` (TEXT)
- `created_at` (TIMESTAMP)

**loans** - Loan applications and records
- `id` (INT, Primary Key)
- `client_id` (INT, Foreign Key)
- `amount` (DECIMAL)
- `interest_rate` (DECIMAL)
- `duration_months` (INT)
- `status` (ENUM: applied, approved, rejected, disbursed, repaid)
- `application_date` (TIMESTAMP)
- `approval_date` (TIMESTAMP, Nullable)
- `created_at` (TIMESTAMP)

**repayments** - Repayment records
- `id` (INT, Primary Key)
- `loan_id` (INT, Foreign Key)
- `amount` (DECIMAL)
- `repayment_date` (TIMESTAMP)
- `created_at` (TIMESTAMP)

## Development Notes

- **Authentication**: JWT tokens expire after 24 hours. Clients must include the token in the `Authorization` header for all protected endpoints
- **Role-Based Access**: 
  - `admin` - Full system access
  - `staff` - Can approve/reject loans and record repayments
  - `client` - Can apply for loans and view own loan records
- **Seed Data**: Initialize with default admin user (email: `admin@example.com`, password: `admin`) on first database setup
- **Error Handling**: All endpoints return appropriate HTTP status codes with detailed error messages in JSON format
- **CORS Support**: API is configured with CORS enabled for cross-origin requests
- **Environment**: Uses `NODE_ENV` to determine development vs. production behavior

## Future Enhancements

- [ ] Password hashing and security improvements
- [ ] Email notifications for loan status updates
- [ ] PDF report generation for loan documents
- [ ] Frontend application (React/Vue)
- [ ] Advanced analytics and reporting dashboard
- [ ] SMS notifications for repayment reminders
- [ ] Integration with payment gateways
