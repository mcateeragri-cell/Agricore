-- AgriCore company website integrations and enquiry workflow
-- Tenant-safe inbound website leads. Public websites authenticate with an integration
-- token; the company_id is resolved server-side and is never accepted from the browser.

begin;

create table if not exists public.company_website_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  secret_hash text not null unique,
  default_branch_id uuid references public.company_branches(id) on delete set null,
  active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_website_integrations_name_check check (char_length(trim(name)) between 1 and 120)
);

create index if not exists company_website_integrations_company_idx
  on public.company_website_integrations(company_id, active, created_at desc);

create table if not exists public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.company_website_integrations(id) on delete set null,
  branch_id uuid references public.company_branches(id) on delete set null,
  source_reference text,
  source text not null default 'website',
  submitted_at timestamptz not null default now(),

  contact_name text not null,
  business_name text,
  phone text not null,
  email text,
  enquiry_type text,
  location text not null,
  machine_description text,
  urgency text,
  requested_dates text,
  work_environment text,
  brands text,
  preferred_contact text,
  message text not null,

  source_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  status text not null default 'new',
  customer_id uuid references public.customers(id) on delete set null,
  machine_id uuid references public.machines(id) on delete set null,
  accepted_job_id uuid references public.jobs(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint website_enquiries_status_check
    check (status in ('new','reviewing','accepted','rejected'))
);

create unique index if not exists website_enquiries_company_reference_unique
  on public.website_enquiries(company_id, source_reference)
  where source_reference is not null and btrim(source_reference) <> '';
create index if not exists website_enquiries_company_status_idx
  on public.website_enquiries(company_id, status, submitted_at desc);
create index if not exists website_enquiries_company_branch_idx
  on public.website_enquiries(company_id, branch_id, submitted_at desc);
create index if not exists website_enquiries_accepted_job_idx
  on public.website_enquiries(company_id, accepted_job_id)
  where accepted_job_id is not null;

alter table public.company_website_integrations enable row level security;
alter table public.website_enquiries enable row level security;

-- All reads/writes go through permission-gated server routes. Public website writes use
-- the service role after a token is validated. No tenant table is directly exposed.
revoke all on public.company_website_integrations from anon, authenticated;
revoke all on public.website_enquiries from anon, authenticated;
grant all on public.company_website_integrations to service_role;
grant all on public.website_enquiries to service_role;

comment on table public.company_website_integrations is
  'Per-company server-to-server website credentials. secret_hash stores SHA-256 only; plaintext tokens are shown once when created.';
comment on table public.website_enquiries is
  'Tenant-scoped public website enquiries awaiting office review and optional conversion to an AgriCore job.';

commit;
