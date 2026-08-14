begin;

create table if not exists public.company_workshop_workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default 'Workshop Workflow',
  slug text not null default 'default',
  is_default boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table if not exists public.company_workshop_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workflow_id uuid not null references public.company_workshop_workflows(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  status_mapping text not null default 'in_progress'
    check(status_mapping in ('open','scheduled','in_progress','waiting_parts','waiting_customer','completed')),
  colour text not null default '#0f766e',
  is_terminal boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workflow_id, slug)
);

create table if not exists public.job_workflow_states (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  workflow_id uuid not null references public.company_workshop_workflows(id) on delete restrict,
  stage_id uuid not null references public.company_workshop_stages(id) on delete restrict,
  entered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.job_workflow_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  workflow_id uuid not null references public.company_workshop_workflows(id) on delete restrict,
  from_stage_id uuid references public.company_workshop_stages(id) on delete set null,
  to_stage_id uuid not null references public.company_workshop_stages(id) on delete restrict,
  event_type text not null default 'stage_changed',
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists job_workflow_events_job_idx on public.job_workflow_events(company_id, job_id, changed_at desc);
create index if not exists company_workshop_stages_workflow_idx on public.company_workshop_stages(company_id, workflow_id, position);

-- Create one default workflow for every existing company.
insert into public.company_workshop_workflows (company_id, name, slug, is_default, active)
select id, 'Standard Workshop Workflow', 'default', true, true
from public.companies
on conflict (company_id, slug) do nothing;

-- Seed stages only where the workflow does not already have them.
insert into public.company_workshop_stages (company_id, workflow_id, name, slug, position, status_mapping, colour, is_terminal)
select w.company_id, w.id, s.name, s.slug, s.position, s.status_mapping, s.colour, s.is_terminal
from public.company_workshop_workflows w
cross join (values
  ('Booked','booked',0,'open','#64748b',false),
  ('Scheduled','scheduled',1,'scheduled','#2563eb',false),
  ('Diagnosis','diagnosis',2,'in_progress','#7c3aed',false),
  ('Waiting Parts','waiting_parts',3,'waiting_parts','#d97706',false),
  ('Repair','repair',4,'in_progress','#059669',false),
  ('Quality Check','quality_check',5,'in_progress','#0891b2',false),
  ('Manager Review','manager_review',6,'in_progress','#4338ca',false),
  ('Ready to Invoice','ready_to_invoice',7,'completed','#15803d',true)
) as s(name,slug,position,status_mapping,colour,is_terminal)
where w.slug='default'
on conflict (workflow_id, slug) do nothing;

-- Backfill current jobs into the best matching stage without changing jobs.status.
insert into public.job_workflow_states (job_id, company_id, workflow_id, stage_id, entered_at, updated_at)
select j.id, j.company_id, w.id, st.id, coalesce(j.updated_at,j.created_at,now()), coalesce(j.updated_at,j.created_at,now())
from public.jobs j
join public.company_workshop_workflows w on w.company_id=j.company_id and w.slug='default'
join lateral (
  select s.id
  from public.company_workshop_stages s
  where s.workflow_id=w.id and s.active=true
  order by case
    when j.status='waiting_parts' and s.slug='waiting_parts' then 0
    when j.status='scheduled' and s.slug='scheduled' then 0
    when j.status='completed' and s.slug='ready_to_invoice' then 0
    when j.status='in_progress' and s.slug='repair' then 0
    when j.status='waiting_customer' and s.status_mapping='waiting_customer' then 0
    when j.status in ('open','new','booked') and s.slug='booked' then 0
    else 10 end,
    s.position
  limit 1
) st on true
on conflict (job_id) do nothing;

alter table public.company_workshop_workflows enable row level security;
alter table public.company_workshop_stages enable row level security;
alter table public.job_workflow_states enable row level security;
alter table public.job_workflow_events enable row level security;

-- Company members may read workflow definitions.
drop policy if exists "Members read workshop workflows" on public.company_workshop_workflows;
create policy "Members read workshop workflows" on public.company_workshop_workflows for select to authenticated using (
  exists(select 1 from public.company_members m where m.company_id=company_workshop_workflows.company_id and m.user_id=auth.uid() and m.is_active=true)
);
drop policy if exists "Members read workshop stages" on public.company_workshop_stages;
create policy "Members read workshop stages" on public.company_workshop_stages for select to authenticated using (
  exists(select 1 from public.company_members m where m.company_id=company_workshop_stages.company_id and m.user_id=auth.uid() and m.is_active=true)
);

-- Managers/admins may manage definitions.
drop policy if exists "Managers manage workshop workflows" on public.company_workshop_workflows;
create policy "Managers manage workshop workflows" on public.company_workshop_workflows for all to authenticated using (
  exists(select 1 from public.company_member_roles r where r.company_id=company_workshop_workflows.company_id and r.user_id=auth.uid() and r.role in ('company_admin','administrator','service_manager'))
) with check (
  exists(select 1 from public.company_member_roles r where r.company_id=company_workshop_workflows.company_id and r.user_id=auth.uid() and r.role in ('company_admin','administrator','service_manager'))
);
drop policy if exists "Managers manage workshop stages" on public.company_workshop_stages;
create policy "Managers manage workshop stages" on public.company_workshop_stages for all to authenticated using (
  exists(select 1 from public.company_member_roles r where r.company_id=company_workshop_stages.company_id and r.user_id=auth.uid() and r.role in ('company_admin','administrator','service_manager'))
) with check (
  exists(select 1 from public.company_member_roles r where r.company_id=company_workshop_stages.company_id and r.user_id=auth.uid() and r.role in ('company_admin','administrator','service_manager'))
);

-- Job workflow state/events use company membership for read; server APIs enforce role + depot scope for writes.
drop policy if exists "Members read job workflow states" on public.job_workflow_states;
create policy "Members read job workflow states" on public.job_workflow_states for select to authenticated using (
  exists(select 1 from public.company_members m where m.company_id=job_workflow_states.company_id and m.user_id=auth.uid() and m.is_active=true)
);
drop policy if exists "Members read job workflow events" on public.job_workflow_events;
create policy "Members read job workflow events" on public.job_workflow_events for select to authenticated using (
  exists(select 1 from public.company_members m where m.company_id=job_workflow_events.company_id and m.user_id=auth.uid() and m.is_active=true)
);

commit;
