create extension if not exists pgcrypto;

create table if not exists public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(company_id, name)
);

create index if not exists manufacturers_company_name_idx
  on public.manufacturers(company_id, lower(name));

create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  manufacturer_id uuid references public.manufacturers(id) on delete set null,
  name text not null,
  description text,
  model_pattern text,
  interval_hours integer,
  interval_months integer,
  checklist_items jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  unique(company_id, name)
);

create index if not exists service_templates_company_status_idx
  on public.service_templates(company_id, status, is_active);

alter table public.manufacturers enable row level security;
alter table public.service_templates enable row level security;

drop policy if exists "Company members can view manufacturers" on public.manufacturers;
create policy "Company members can view manufacturers"
on public.manufacturers for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = manufacturers.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company members can manage manufacturers" on public.manufacturers;
create policy "Company members can manage manufacturers"
on public.manufacturers for all
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = manufacturers.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = manufacturers.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company members can view service templates" on public.service_templates;
create policy "Company members can view service templates"
on public.service_templates for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = service_templates.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company members can manage service templates" on public.service_templates;
create policy "Company members can manage service templates"
on public.service_templates for all
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = service_templates.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = service_templates.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);
