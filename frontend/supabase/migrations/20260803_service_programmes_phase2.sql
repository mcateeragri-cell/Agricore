begin;

-- One active programme per machine.
with ranked as (
  select
    id,
    row_number() over (
      partition by company_id, machine_id
      order by updated_at desc nulls last, created_at desc
    ) as rn
  from public.machine_service_programmes
  where active = true
)
update public.machine_service_programmes msp
set active = false,
    updated_at = now()
from ranked
where ranked.id = msp.id
  and ranked.rn > 1;

create unique index if not exists machine_service_programmes_one_active_idx
  on public.machine_service_programmes(company_id, machine_id)
  where active = true;

alter table public.jobs
  add column if not exists service_programme_assignment_id uuid
    references public.machine_service_programmes(id) on delete set null,
  add column if not exists service_programme_name text,
  add column if not exists service_checklist jsonb not null default '[]'::jsonb;

create table if not exists public.machine_service_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  programme_id uuid references public.service_programmes(id) on delete set null,
  assignment_id uuid references public.machine_service_programmes(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  service_name text not null,
  service_date date not null,
  service_hours numeric(10,2),
  technician_name text,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists machine_service_events_machine_idx
  on public.machine_service_events(company_id, machine_id, service_date desc);

alter table public.machine_service_events enable row level security;

drop policy if exists "Company members manage machine service events"
  on public.machine_service_events;

create policy "Company members manage machine service events"
on public.machine_service_events
for all to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = machine_service_events.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = machine_service_events.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

commit;
