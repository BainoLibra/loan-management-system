---
name: loan-management-integration
description: "Integrate a secure multi-tenant loan management system into an existing Next.js and Supabase application. Use for LMS discovery, additive database migrations, organisation isolation, RLS, roles and permissions, loan products, applications, approvals, disbursements, repayments, collections, reporting, and financial workflow verification."
argument-hint: "Describe the existing application, requested LMS module, or failing loan workflow"
user-invocable: true
disable-model-invocation: false
---

# Loan Management Integration

## Outcome

Extend the existing application into a secure, configurable loan management system while preserving working routes, authentication, UI, business logic, and database relationships. Make the smallest additive change that satisfies the requested capability, and do not claim a workflow is complete until it has executable verification.

## When to Use

Use this skill when a task involves one or more of the following:

- Integrating loan, borrower, member, lending, SACCO, microfinance, or credit workflows into an existing app.
- Extending a Next.js application that uses Supabase for database, authentication, storage, RLS, or server-side functions.
- Designing or reviewing tenant isolation, organisation memberships, roles, permissions, approval limits, or segregation of duties.
- Implementing or changing loan products, applications, assessments, approvals, disbursements, repayment schedules, repayments, reversals, collections, accounting, notifications, or reports.
- Auditing financial integrity, idempotency, concurrency, sensitive-data access, or migration compatibility.

Do not use this skill to replace an existing application, reset a database, invent an unseen schema, or build a standalone demo when integration is requested.

## Operating Rules

- Inspect before editing. Start from the named file, route, failing test, table, or workflow and follow the controlling code path.
- Reuse existing clients, layouts, validation, auth, permissions, service boundaries, tables, and design conventions.
- Treat all organisation, branch, user, role, approval, amount, status, and account identifiers supplied by a client as untrusted.
- Enforce authorisation on the server and tenant boundaries in Supabase RLS; frontend visibility is never an access-control mechanism.
- Use additive, version-controlled migrations. Preserve existing rows, policies, URLs, and behaviour unless a compatibility-preserving change is required.
- Never expose service-role credentials or provider secrets in browser code, logs, documentation, or generated responses.
- Use decimal or integer minor units for money, explicit rounding rules, database transactions, unique idempotency keys, and locking or equivalent concurrency controls for critical financial operations.
- Preserve immutable financial history. Use audited reversals or adjustments instead of editing posted transactions.
- Keep organisation-specific policies, rates, fees, thresholds, currencies, schedules, and compliance obligations configurable.

## Procedure

### 1. Establish the Existing Architecture

Inspect only enough nearby code and configuration to form a concrete hypothesis about the requested behaviour and one cheap check that could disconfirm it. Then inspect the broader surfaces needed for implementation:

1. Identify Next.js version and App Router or Pages Router.
2. Locate Supabase browser/server clients, middleware, auth/session handling, environment variable names, API routes, Server Actions, and database functions.
3. Map layouts, navigation, dashboards, forms, validation, tables, error/loading states, and styling conventions.
4. Inventory existing tables, relationships, indexes, views, functions, RLS policies, storage buckets, roles, customers, loans, payments, accounting, audit logs, and reports.
5. Read relevant tests and package scripts. Inspect schema read-only before proposing new entities.
6. Record what can be reused, what is missing, which files will change, which files are new, migration needs, and compatibility risks.

Do not print secret values. Refer to environment variables by name only.

### 2. Map the Domain Without Duplicating It

Before adding a table or module, find the existing equivalent. Extend an existing concept when it has the right ownership and lifecycle; add a new concept only when the current model cannot represent the requirement safely.

Use organisation-scoped entities where applicable:

- organisations and organisation memberships
- branches and operational units
- roles, permissions, approval policies, and limits
- customers or SACCO members, KYC records, documents, guarantors, and collateral
- loan products and configurable terms
- applications, assessments, approvals, committees, and decisions
- loan accounts, disbursements, schedules, repayments, allocations, and reversals
- collections activities, restructuring, notifications, audit events, and reports
- accounting journals and mappings only when no existing ledger can own them

Define ownership and access scope explicitly for every entity. A platform administrator's operational role must not imply unrestricted financial access to every organisation.

### 3. Design Tenant and Permission Boundaries

1. Support multiple organisation memberships when required, with an explicit current organisation context.
2. Resolve membership, branch scope, role, permission, approval authority, and status on the server for every sensitive operation.
3. Add foreign keys, non-null tenant ownership where appropriate, uniqueness constraints, valid-status constraints, and indexes supporting authorised queries.
4. Implement and test RLS for every tenant-scoped table and storage object. Policies must derive identity from the authenticated session and trusted membership data, not request payloads.
5. Protect privileged database functions with explicit ownership, search-path discipline, argument validation, and permission checks.
6. Ensure reports, background jobs, notifications, exports, and database views carry tenant and branch restrictions.
7. Apply segregation of duties: an applicant or loan officer must not approve their own application where policy forbids it.

Use granular permissions such as `organisation.manage`, `users.manage`, `branches.manage`, `customers.view`, `customers.create`, `loans.create`, `loans.view`, `loans.assess`, `loans.review`, `loans.approve`, `loans.reject`, `loans.disburse`, `repayments.record`, `repayments.reverse`, `accounting.view`, `accounting.manage`, `collections.manage`, `reports.view`, `audit.view`, and `loan_products.manage`, adapting names to existing conventions.

### 4. Implement Critical Loan Workflows

Implement each requested workflow as a state machine with server-side validation, an audit event, and a focused test for both success and rejection paths.

**Applications and assessment**

- Validate borrower, product, amount, term, purpose, required documents, affordability data, guarantors, collateral, and eligibility.
- Prevent incomplete or unauthorised records from entering approval.
- Preserve status history, assessment results, recommendations, and requests for more information.

**Approval**

- Resolve the applicable product and organisation approval policy from trusted database state.
- Enforce approval levels, amount thresholds, quorum or voting rules, conflict checks, and required comments.
- Revalidate status and authority immediately before each decision and before disbursement.
- Preserve all decisions, timestamps, approvers, policy versions, and comments.

**Disbursement**

- Permit only fully approved loans with satisfied conditions.
- Use a unique idempotency key and transaction-safe status transition.
- Record amount, currency, method, destination, reference, actor, and provider outcome.
- Distinguish pending, successful, and failed external payment results. Never mark success merely because a request was submitted.
- Support partial disbursement only when the product permits it.

**Repayment**

- Generate schedules using configured terms, frequency, grace periods, rates, fees, penalties, and rounding rules.
- Allocate payments according to a documented configurable policy across principal, interest, fees, penalties, and other components.
- Handle partial, advance, overpayment, arrears, receipts, statements, and authorised reversals.
- Make posting idempotent and concurrency-safe. Do not derive financial truth from duplicated mutable totals.

**Collections and accounting**

- Calculate days past due and ageing using configured rules.
- Record collection attempts, promises, outcomes, assignments, escalations, and restructuring approvals.
- Integrate with an existing ledger where present. Posted entries are immutable; corrections are audited reversals or adjustments.

### 5. Add the User Interface Through Existing Surfaces

Integrate into the existing navigation, layouts, components, routes, and responsive design system. Provide real loading, empty, validation, success, error, pagination, filtering, sorting, and search states. Use accessible forms and server-backed actions. Do not leave critical buttons as placeholders or rely on mock data for production workflows.

Dashboards and reports must be scoped to the selected authorised organisation and branch context, and must respect role permissions. SACCO-specific membership, savings, shares, and eligibility features remain optional and must not be forced onto banks, microfinance institutions, or private lenders.

### 6. Migrate Safely

Create additive migration files using repository conventions. Before applying them:

1. Check for name collisions and equivalent tables or columns.
2. Define foreign keys, checks, indexes, uniqueness, timestamps, status transitions, and tenant ownership.
3. Add RLS policies and storage policies in the same change set where applicable.
4. Make backfills deterministic and preserve existing data.
5. Use transactions for schema changes when supported, and document any non-transactional operation.
6. Validate against a disposable or development environment before production.

Never reset Supabase, drop existing tables, remove policies for convenience, or overwrite production records.

### 7. Verify Incrementally

After each substantive edit, run the narrowest available executable check before expanding the change. Prefer:

1. The failing or behaviour-scoped test.
2. A focused unit or integration test for the touched workflow.
3. A migration or database policy check in a safe environment.
4. Narrow lint, type-check, or build commands.
5. The complete test suite and production build after focused checks pass.

Test positive and negative paths for authentication, membership and role enforcement, tenant isolation, RLS, storage access, applications, approval thresholds, self-approval, disbursement validation, duplicate prevention, repayment allocation, reversals, concurrency, calculations, reporting permissions, and migration compatibility. Report commands and actual results; do not claim tests passed when they were unavailable or not run.

## Completion Checklist

Before declaring the task complete, confirm:

- Existing architecture and reusable surfaces were documented.
- No existing feature, route, schema relationship, or auth path was unnecessarily replaced.
- Every sensitive operation has server-side authentication and permission checks.
- Every tenant-scoped table, report, job, storage object, and function has an enforced tenant boundary.
- Money uses exact arithmetic, consistent rounding, idempotency, and transaction-safe state transitions.
- Approval, disbursement, repayment, reversal, and permission changes are audited.
- Migrations are additive, version-controlled, reversible or operationally documented, and preserve data.
- UI states and permissions are integrated into existing patterns.
- Tests cover both allowed and denied behaviour, including concurrency-sensitive operations where applicable.
- Required environment variable names, external credentials, deployment steps, limitations, and unresolved risks are documented without values or secrets.

## Final Report

Summarize:

1. Existing architecture discovered and reused.
2. Modules and workflows implemented.
3. Modified and new files.
4. Migrations and safe application instructions.
5. Roles, permissions, approval rules, tenant isolation, and RLS.
6. Tests run with actual results.
7. Required environment variable names and external setup.
8. Incomplete functionality, limitations, and deployment risks.
