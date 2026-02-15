# Loan Management System

A role-based loan management system built with Node.js and Express on the backend, designed to manage loan applications, approvals, disbursements, and repayments.

## Overview

This system provides functionality for:
- **User Authentication**: Role-based auth (Admin, Staff, Client)
- **Client Management**: Create and manage loan clients
- **Loan Management**: Apply for loans, approve/reject applications, disburse funds
- **Repayment Tracking**: Record and track loan repayments
- **Loan Status Tracking**: Track loans through different statuses (applied, approved, rejected, disbursed, repaid)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **API**: RESTful API with CORS support
- **Development**: Nodemon for hot-reloading

## Project Structure

```
loan-management-system/
├── backend/
│   ├── index.js          # Express server and API endpoints
│   ├── db.js             # MySQL database connection and initialization
│   ├── package.json      # Backend dependencies
│   └── ...
└── README.md
```

## Backend Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server running locally or on a configured host

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
# .env file (or set directly)
MYSQL_HOST=127.0.0.1
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=loan_management
PORT=4000
```

### Running the Server

**Development mode** (with auto-reload):
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
- `POST /api/auth/login` - Login with email and password

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create a new client

### Loans
- `GET /api/loans` - Get all loans
- `POST /api/loans` - Apply for a loan
- `GET /api/loans/:id` - Get loan details
- `PUT /api/loans/:id/approve` - Approve a loan application
- `PUT /api/loans/:id/disburse` - Disburse approved loan
- `PUT /api/loans/:id/reject` - Reject a loan application

### Repayments
- `GET /api/repayments/loan/:loanId` - Get repayments for a loan
- `POST /api/repayments` - Record a repayment

## Database Schema

The system uses the following tables:
- **users**: Store user accounts with roles (admin, staff, client)
- **clients**: Store client information
- **loans**: Store loan applications with status tracking
- **repayments**: Store repayment records

## Development Notes

- Default admin user is seeded on first run (email: `admin@example.com`, password: `admin`)
- All endpoints support JSON request/response bodies with CORS enabled
- Error handling returns appropriate HTTP status codes and error messages
