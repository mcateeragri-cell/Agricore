begin;

insert into public.platform_features (
  feature_key,
  feature_name,
  description,
  default_enabled
)
values (
  'workshop_operations',
  'Workshop Operations',
  'Visual workshop control, technician capacity and live workshop screen.',
  false
)
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description;

-- Workshop Operations is a Professional/Enterprise capability.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, 'workshop_operations', true
from public.subscription_plans p
where p.slug in ('professional', 'enterprise')
on conflict (plan_id, feature_key) do update
set enabled = excluded.enabled;

insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, 'workshop_operations', false
from public.subscription_plans p
where p.slug = 'starter'
on conflict (plan_id, feature_key) do update
set enabled = excluded.enabled;

create table if not exists public.company_workshop_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  workday_hours numeric(5,2) not null default 8.00
    check (workday_hours > 0 and workday_hours <= 24),
  overload_percent integer not null default 100
    check (overload_percent between 50 and 200),
  tv_refresh_seconds integer not null default 30
    check (tv_refresh_seconds between 10 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_workshop_settings (company_id)
select id
from public.companies
on conflict (company_id) do nothing;

alter table public.company_workshop_settings enable row level security;

drop policy if exists "Company members read workshop settings"
  on public.company_workshop_settings;

create policy "Company members read workshop settings"
on public.company_workshop_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members member
    where member.company_id = company_workshop_settings.company_id
      and member.user_id = auth.uid()
      and member.is_active = true
  )
);

drop policy if exists "Company admins manage workshop settings"
  on public.company_workshop_settings;

create policy "Company admins manage workshop settings"
on public.company_workshop_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.company_member_roles role_record
    where role_record.company_id = company_workshop_settings.company_id
      and role_record.user_id = auth.uid()
      and role_record.role in ('company_admin','administrator','service_manager')
  )
)
with check (
  exists (
    select 1
    from public.company_member_roles role_record
    where role_record.company_id = company_workshop_settings.company_id
      and role_record.user_id = auth.uid()
      and role_record.role in ('company_admin','administrator','service_manager')
  )
);

commit;
