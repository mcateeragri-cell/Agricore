begin;

create table if not exists public.company_field_operations_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  gps_enabled boolean not null default true,
  return_journey_enabled boolean not null default true,
  dispatch_location_enabled boolean not null default false,
  automatic_status_enabled boolean not null default true,
  travel_time_enabled boolean not null default true,
  travel_costing_enabled boolean not null default false,
  job_timeline_enabled boolean not null default true,
  technician_summary_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_field_operations_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

alter table public.company_field_operations_settings enable row level security;

drop policy if exists "Company members can read field operations settings" on public.company_field_operations_settings;
create policy "Company members can read field operations settings"
on public.company_field_operations_settings for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_field_operations_settings.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company settings managers can update field operations settings" on public.company_field_operations_settings;
create policy "Company settings managers can update field operations settings"
on public.company_field_operations_settings for all
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_field_operations_settings.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_field_operations_settings.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

commit;
