-- Run this complete script in Supabase SQL Editor.
-- It contains no placeholders and is safe to rerun.

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
create policy organizations_member_select
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

drop policy if exists memberships_self_select on public.organization_memberships;
create policy memberships_self_select
on public.organization_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = "userId"
      and lower(u.email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  )
);

drop policy if exists branches_member_access on public.branches;
create policy branches_member_access
on public.branches
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists loan_products_member_access on public.loan_products;
create policy loan_products_member_access
on public.loan_products
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists loan_disbursements_member_access on public.loan_disbursements;
create policy loan_disbursements_member_access
on public.loan_disbursements
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists collection_activities_member_access on public.collection_activities;
create policy collection_activities_member_access
on public.collection_activities
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists journal_entries_member_access on public.journal_entries;
create policy journal_entries_member_access
on public.journal_entries
for select
to authenticated
using (public.is_org_member("organizationId"));

drop policy if exists notifications_member_access on public.notifications;
create policy notifications_member_access
on public.notifications
for select
to authenticated
using (public.is_org_member("organizationId"));

drop policy if exists groups_member_access on public.groups;
create policy groups_member_access
on public.groups
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists clients_member_access on public.clients;
create policy clients_member_access
on public.clients
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));

drop policy if exists loans_member_access on public.loans;
create policy loans_member_access
on public.loans
for all
to authenticated
using (public.is_org_member("organizationId"))
with check (public.is_org_member("organizationId"));
