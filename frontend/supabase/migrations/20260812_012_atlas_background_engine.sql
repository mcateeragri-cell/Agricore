-- AgriCore Project Atlas Phase 1 background engine
-- Adds queueing, snapshots, processing history and AI context cache.
-- No machine health score is created.

begin;

alter table public.atlas_events
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;

create table if not exists public.atlas_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_event_id uuid references public.atlas_events(id) on delete cascade,
  task_type text not null default 'process_event',
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint atlas_queue_status_check check (status in ('queued','running','completed','failed')),
  unique(source_event_id, task_type)
);
create index if not exists atlas_queue_status_available_idx on public.atlas_queue(status, available_at, created_at);
create index if not exists atlas_queue_company_status_idx on public.atlas_queue(company_id, status, created_at desc);
alter table public.atlas_queue enable row level security;
revoke all on public.atlas_queue from anon;

create table if not exists public.atlas_intelligence_snapshots (
  company_id uuid primary key references public.companies(id) on delete cascade,
  overview jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.atlas_intelligence_snapshots enable row level security;
revoke all on public.atlas_intelligence_snapshots from anon;

create table if not exists public.atlas_ai_context_cache (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  context jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, entity_type, entity_id)
);
create index if not exists atlas_ai_context_cache_company_idx on public.atlas_ai_context_cache(company_id, entity_type, generated_at desc);
alter table public.atlas_ai_context_cache enable row level security;
revoke all on public.atlas_ai_context_cache from anon;

create table if not exists public.atlas_processing_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  tasks_processed integer not null default 0,
  tasks_failed integer not null default 0,
  companies_processed integer not null default 0,
  last_error text,
  constraint atlas_processing_runs_status_check check (status in ('running','completed','completed_with_errors','failed'))
);
create index if not exists atlas_processing_runs_started_idx on public.atlas_processing_runs(started_at desc);
alter table public.atlas_processing_runs enable row level security;
revoke all on public.atlas_processing_runs from anon;

create or replace function public.atlas_enqueue_captured_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.atlas_queue(
    company_id,
    source_event_id,
    task_type,
    entity_type,
    entity_id,
    payload
  ) values (
    NEW.company_id,
    NEW.id,
    'process_event',
    NEW.entity_type,
    NEW.entity_id,
    NEW.payload
  )
  on conflict (source_event_id, task_type) do nothing;
  return NEW;
end;
$$;

drop trigger if exists atlas_queue_captured_event on public.atlas_events;
create trigger atlas_queue_captured_event
after insert on public.atlas_events
for each row execute function public.atlas_enqueue_captured_event();

create or replace function public.atlas_claim_queue(p_limit integer default 100, p_company_id uuid default null)
returns setof public.atlas_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select q.id
    from public.atlas_queue q
    where q.status = 'queued'
      and q.available_at <= now()
      and (p_company_id is null or q.company_id = p_company_id)
    order by q.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update public.atlas_queue q
  set status = 'running',
      locked_at = now(),
      attempts = q.attempts + 1,
      last_error = null
  from claimed
  where q.id = claimed.id
  returning q.*;
end;
$$;

revoke all on function public.atlas_claim_queue(integer, uuid) from public, anon, authenticated;

-- Prevent tasks left running by an interrupted worker from staying stuck forever.
create or replace function public.atlas_requeue_stale_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.atlas_queue
  set status = case when attempts >= 5 then 'failed' else 'queued' end,
      available_at = case when attempts >= 5 then available_at else now() end,
      locked_at = null,
      last_error = coalesce(last_error, 'Worker lock expired before completion')
  where status = 'running'
    and locked_at < now() - interval '30 minutes';
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.atlas_requeue_stale_tasks() from public, anon, authenticated;

-- Do not force a large historic replay. Mark old events complete, then queue only the
-- most recent seven days so Atlas starts with useful current context.
update public.atlas_events
set processed_at = coalesce(processed_at, now())
where processed_at is null
  and occurred_at < now() - interval '7 days';

insert into public.atlas_queue(company_id, source_event_id, task_type, entity_type, entity_id, payload)
select company_id, id, 'process_event', entity_type, entity_id, payload
from public.atlas_events
where processed_at is null
  and occurred_at >= now() - interval '7 days'
on conflict (source_event_id, task_type) do nothing;

commit;
