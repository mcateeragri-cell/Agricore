-- Patch 009: initial launch allowances and adjustable company overrides.
-- Apply through your normal Supabase migration process after review.
begin;
update public.subscription_plans
set max_storage_gb = case slug when 'starter' then 5 when 'professional' then 25 when 'enterprise' then 100 end,
    max_users = case slug when 'starter' then 4 when 'professional' then 15 when 'enterprise' then 2147483647 end,
    updated_at = now()
where slug in ('starter','professional','enterprise');

create table if not exists public.company_storage_overrides (
  company_id uuid primary key references public.companies(id) on delete cascade,
  storage_limit_gb integer not null check (storage_limit_gb > 0),
  updated_at timestamptz not null default now()
);
alter table public.company_storage_overrides enable row level security;
revoke all on public.company_storage_overrides from anon, authenticated;
commit;
