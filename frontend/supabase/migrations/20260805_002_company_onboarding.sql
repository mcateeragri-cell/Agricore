-- AgriCore v1.2 - company onboarding progress

create table if not exists public.company_onboarding (
  company_id uuid primary key references public.companies(id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 6),
  business_details_complete boolean not null default false,
  invoice_settings_complete boolean not null default false,
  payment_settings_complete boolean not null default false,
  team_setup_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_onboarding enable row level security;

drop policy if exists "Company administrators can view onboarding" on public.company_onboarding;
create policy "Company administrators can view onboarding"
on public.company_onboarding
for select
to authenticated
using (
  exists (
    select 1
    from public.company_member_roles role_row
    where role_row.company_id = company_onboarding.company_id
      and role_row.user_id = auth.uid()
      and role_row.role in ('company_admin', 'administrator')
  )
);

drop policy if exists "Company administrators can update onboarding" on public.company_onboarding;
create policy "Company administrators can update onboarding"
on public.company_onboarding
for all
to authenticated
using (
  exists (
    select 1
    from public.company_member_roles role_row
    where role_row.company_id = company_onboarding.company_id
      and role_row.user_id = auth.uid()
      and role_row.role in ('company_admin', 'administrator')
  )
)
with check (
  exists (
    select 1
    from public.company_member_roles role_row
    where role_row.company_id = company_onboarding.company_id
      and role_row.user_id = auth.uid()
      and role_row.role in ('company_admin', 'administrator')
  )
);

create index if not exists company_onboarding_completed_idx
  on public.company_onboarding(completed_at);
