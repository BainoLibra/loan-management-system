-- Repair migration: align enum names with Prisma's generated PostgreSQL identifiers.
-- Existing values are preserved; only column types/defaults are converted.

do $$ begin create type public."OrganizationType" as enum ('BANK', 'SACCO', 'MICROFINANCE', 'PRIVATE_LENDER'); exception when duplicate_object then null; end $$;
do $$ begin create type public."OrganizationStatus" as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public."MembershipStatus" as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public."RepaymentFrequency" as enum ('WEEKLY', 'MONTHLY'); exception when duplicate_object then null; end $$;
do $$ begin create type public."ApprovalDecision" as enum ('APPROVED', 'REJECTED', 'REVISION_REQUESTED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."DisbursementStatus" as enum ('PENDING', 'SUCCESSFUL', 'FAILED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."RepaymentStatus" as enum ('ACTIVE', 'REVERSED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."NotificationStatus" as enum ('PENDING', 'SENT', 'FAILED'); exception when duplicate_object then null; end $$;

alter table public.organizations alter column "type" drop default;
alter table public.organizations alter column status drop default;
alter table public.organizations alter column "type" type public."OrganizationType" using "type"::text::public."OrganizationType";
alter table public.organizations alter column status type public."OrganizationStatus" using status::text::public."OrganizationStatus";
alter table public.organizations alter column status set default 'active'::public."OrganizationStatus";

alter table public.organization_memberships alter column status drop default;
alter table public.organization_memberships alter column status type public."MembershipStatus" using status::text::public."MembershipStatus";
alter table public.organization_memberships alter column status set default 'active'::public."MembershipStatus";

alter table public.loan_products alter column "repaymentFrequency" drop default;
alter table public.loan_products alter column "repaymentFrequency" type public."RepaymentFrequency" using "repaymentFrequency"::text::public."RepaymentFrequency";
alter table public.loan_products alter column "repaymentFrequency" set default 'MONTHLY'::public."RepaymentFrequency";

alter table public.loan_approvals alter column decision type public."ApprovalDecision" using decision::text::public."ApprovalDecision";

alter table public.loan_disbursements alter column status drop default;
alter table public.loan_disbursements alter column status type public."DisbursementStatus" using status::text::public."DisbursementStatus";
alter table public.loan_disbursements alter column status set default 'PENDING'::public."DisbursementStatus";

alter table public.repayments alter column status drop default;
alter table public.repayments alter column status type public."RepaymentStatus" using status::text::public."RepaymentStatus";
alter table public.repayments alter column status set default 'ACTIVE'::public."RepaymentStatus";

alter table public.notifications alter column status drop default;
alter table public.notifications alter column status type public."NotificationStatus" using status::text::public."NotificationStatus";
alter table public.notifications alter column status set default 'PENDING'::public."NotificationStatus";
