-- Complete manual repair for the organization access error.
-- Run this entire script once in Supabase SQL Editor.
-- Do not include Markdown fences or paste abbreviated examples.

-- 1. Create the enum names expected by Prisma.
do $$ begin create type public."OrganizationType" as enum ('BANK', 'SACCO', 'MICROFINANCE', 'PRIVATE_LENDER'); exception when duplicate_object then null; end $$;
do $$ begin create type public."OrganizationStatus" as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public."MembershipStatus" as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public."RepaymentFrequency" as enum ('WEEKLY', 'MONTHLY'); exception when duplicate_object then null; end $$;
do $$ begin create type public."ApprovalDecision" as enum ('APPROVED', 'REJECTED', 'REVISION_REQUESTED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."DisbursementStatus" as enum ('PENDING', 'SUCCESSFUL', 'FAILED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."RepaymentStatus" as enum ('ACTIVE', 'REVERSED'); exception when duplicate_object then null; end $$;
do $$ begin create type public."NotificationStatus" as enum ('PENDING', 'SENT', 'FAILED'); exception when duplicate_object then null; end $$;

-- 2. Convert existing columns to the Prisma-compatible enum names.
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

-- 3. Recreate the organization membership function and all policies.
create or replace function public.is_org_member(target_org bigint)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.users u on u.id = m."userId"
    where m."organizationId" = target_org
      and m.status = 'active'
      and lower(u.email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  );
$$;

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations for select to authenticated
using (public.is_org_member(id));

drop policy if exists memberships_self_select on public.organization_memberships;
create policy memberships_self_select on public.organization_memberships for select to authenticated
using (exists (
  select 1 from public.users u
  where u.id = "userId"
    and lower(u.email) = lower(coalesce((select auth.jwt()->>'email'), ''))
));

drop policy if exists branches_member_access on public.branches;
create policy branches_member_access on public.branches for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists loan_products_member_access on public.loan_products;
create policy loan_products_member_access on public.loan_products for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists loan_disbursements_member_access on public.loan_disbursements;
create policy loan_disbursements_member_access on public.loan_disbursements for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists collection_activities_member_access on public.collection_activities;
create policy collection_activities_member_access on public.collection_activities for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists journal_entries_member_access on public.journal_entries;
create policy journal_entries_member_access on public.journal_entries for select to authenticated
using (public.is_org_member("organizationId"));

drop policy if exists notifications_member_access on public.notifications;
create policy notifications_member_access on public.notifications for select to authenticated
using (public.is_org_member("organizationId"));

drop policy if exists groups_member_access on public.groups;
create policy groups_member_access on public.groups for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists clients_member_access on public.clients;
create policy clients_member_access on public.clients for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));

drop policy if exists loans_member_access on public.loans;
create policy loans_member_access on public.loans for all to authenticated
using (public.is_org_member("organizationId")) with check (public.is_org_member("organizationId"));
