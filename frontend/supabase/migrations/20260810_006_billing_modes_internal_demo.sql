-- AgriCore RC-1.1 Billing Modes
-- Explicitly separates platform-owned, demo and normal subscription companies.

begin;

alter table public.companies
  add column if not exists billing_mode text not null default 'subscription';

-- Replace any old/partial constraint with the current allowed values.
alter table public.companies
  drop constraint if exists companies_billing_mode_check;

alter table public.companies
  add constraint companies_billing_mode_check
  check (billing_mode in ('subscription', 'internal', 'demo'));

-- Existing demo workspaces are always billing-exempt.
update public.companies
set billing_mode = 'demo'
where billing_mode <> 'demo'
  and (
    slug like 'demo-%'
    or lower(company_name) like '% demo %'
  );

-- AgriCore owner's operating businesses have lifetime internal access.
-- This is intentionally based on the company names already used in this deployment.
update public.companies
set billing_mode = 'internal'
where lower(company_name) like 'mcateer agricultural services%'
   or lower(company_name) like 'glenagri dairy services%';

create index if not exists companies_billing_mode_idx
  on public.companies (billing_mode);

commit;
