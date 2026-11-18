-- Run in Supabase SQL Editor before deploying the app changes.
-- Tokens are unguessable capabilities; only the server service-role can read this table.
create table if not exists public.machine_public_passports (
  machine_id uuid primary key references public.machines(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists machine_public_passports_company_idx on public.machine_public_passports(company_id);
alter table public.machine_public_passports enable row level security;
revoke all on public.machine_public_passports from anon, authenticated;
-- No client policies: server API enforces membership and permissions.
