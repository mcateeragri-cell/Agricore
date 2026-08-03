begin;

alter table public.machines
  add column if not exists usage_profile text not null default 'medium',
  add column if not exists estimated_hours_per_week numeric(10,2) not null default 25;

alter table public.machines
  drop constraint if exists machines_usage_profile_check;

alter table public.machines
  add constraint machines_usage_profile_check
  check (usage_profile in ('light', 'medium', 'heavy'));

alter table public.machines
  drop constraint if exists machines_estimated_hours_per_week_check;

alter table public.machines
  add constraint machines_estimated_hours_per_week_check
  check (estimated_hours_per_week >= 0);

create table if not exists public.service_programmes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  manufacturer text,
  model_pattern text,
  description text,
  interval_hours numeric(10,2),
  interval_months integer,
  estimated_labour_hours numeric(10,2),
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_programmes_interval_required
    check (interval_hours is not null or interval_months is not null),
  constraint service_programmes_interval_hours_check
    check (interval_hours is null or interval_hours > 0),
  constraint service_programmes_interval_months_check
    check (interval_months is null or interval_months > 0),
  constraint service_programmes_labour_check
    check (estimated_labour_hours is null or estimated_labour_hours >= 0)
);

create index if not exists service_programmes_company_idx
  on public.service_programmes(company_id, active, manufacturer, model_pattern);

create table if not exists public.service_programme_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  programme_id uuid not null references public.service_programmes(id) on delete cascade,
  item_type text not null default 'checklist',
  description text not null,
  quantity numeric(10,2),
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint service_programme_items_type_check
    check (item_type in ('checklist', 'part', 'fluid', 'note'))
);

create index if not exists service_programme_items_programme_idx
  on public.service_programme_items(company_id, programme_id, sort_order);

create table if not exists public.machine_service_programmes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  programme_id uuid not null references public.service_programmes(id) on delete cascade,
  last_service_hours numeric(10,2),
  last_service_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, machine_id, programme_id)
);

create index if not exists machine_service_programmes_machine_idx
  on public.machine_service_programmes(company_id, machine_id, active);

alter table public.service_programmes enable row level security;
alter table public.service_programme_items enable row level security;
alter table public.machine_service_programmes enable row level security;

create policy "Company members manage service programmes"
on public.service_programmes
for all to authenticated
using (exists (
  select 1 from public.company_members cm
  where cm.company_id = service_programmes.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
))
with check (exists (
  select 1 from public.company_members cm
  where cm.company_id = service_programmes.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
));

create policy "Company members manage service programme items"
on public.service_programme_items
for all to authenticated
using (exists (
  select 1 from public.company_members cm
  where cm.company_id = service_programme_items.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
))
with check (exists (
  select 1 from public.company_members cm
  where cm.company_id = service_programme_items.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
));

create policy "Company members manage machine service programmes"
on public.machine_service_programmes
for all to authenticated
using (exists (
  select 1 from public.company_members cm
  where cm.company_id = machine_service_programmes.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
))
with check (exists (
  select 1 from public.company_members cm
  where cm.company_id = machine_service_programmes.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
));

commit;
