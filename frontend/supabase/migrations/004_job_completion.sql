-- AgriCore job completion workflow
-- Stores technician submissions, customer signatures,
-- completion checks and office review decisions.

create extension if not exists pgcrypto;

create table if not exists public.job_completions (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null references public.jobs(id) on delete cascade,
  assignment_id uuid references public.job_assignments(id) on delete set null,

  company_id uuid null,

  submitted_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,

  technician_name text not null default '',

  diagnosis text not null default '',
  work_carried_out text not null default '',

  customer_name text not null default '',
  customer_position text not null default '',

  customer_confirmation boolean not null default false,

  signature_data_url text,
  signature_storage_path text,

  machine_tested boolean not null default false,
  guards_fitted boolean not null default false,
  area_left_tidy boolean not null default false,
  customer_instructed boolean not null default false,
  photos_checked boolean not null default false,
  parts_checked boolean not null default false,
  labour_checked boolean not null default false,

  technician_notes text not null default '',
  office_notes text not null default '',
  rejection_reason text not null default '',

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'cancelled'
      )
    ),

  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint job_completions_job_unique unique (job_id),

  constraint job_completion_submission_requirements check (
    status = 'draft'
    or status = 'cancelled'
    or (
      length(trim(diagnosis)) > 0
      and length(trim(work_carried_out)) > 0
      and length(trim(customer_name)) > 0
      and customer_confirmation = true
      and (
        signature_data_url is not null
        or signature_storage_path is not null
      )
    )
  )
);

create index if not exists job_completions_status_idx
  on public.job_completions(status);

create index if not exists job_completions_submitted_by_idx
  on public.job_completions(submitted_by);

create index if not exists job_completions_submitted_at_idx
  on public.job_completions(submitted_at desc);

create index if not exists job_completions_company_id_idx
  on public.job_completions(company_id);

comment on table public.job_completions is
  'Technician job completion submissions and office review decisions.';

comment on column public.job_completions.signature_data_url is
  'Temporary or fallback base64 signature representation.';

comment on column public.job_completions.signature_storage_path is
  'Preferred private Supabase Storage path for the signature image.';


-- Automatically maintain updated_at.
create or replace function public.set_job_completion_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_job_completion_updated_at
  on public.job_completions;

create trigger set_job_completion_updated_at
before update on public.job_completions
for each row
execute function public.set_job_completion_updated_at();


-- Enable row-level security.
alter table public.job_completions enable row level security;


-- Authenticated users may read completion records for jobs assigned to them.
drop policy if exists
  "Technicians read assigned job completions"
  on public.job_completions;

create policy
  "Technicians read assigned job completions"
on public.job_completions
for select
to authenticated
using (
  exists (
    select 1
    from public.job_assignments assignment
    where assignment.job_id = job_completions.job_id
      and assignment.user_id = auth.uid()
      and coalesce(assignment.assignment_status, '') <> 'cancelled'
  )
  or exists (
    select 1
    from public.app_user_roles role_record
    where role_record.user_id = auth.uid()
      and role_record.role in (
        'administrator',
        'service_manager',
        'admin',
        'manager',
        'owner',
        'office'
      )
  )
);


-- Assigned technicians may create their own completion record.
drop policy if exists
  "Technicians create assigned job completions"
  on public.job_completions;

create policy
  "Technicians create assigned job completions"
on public.job_completions
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.job_assignments assignment
    where assignment.job_id = job_completions.job_id
      and assignment.user_id = auth.uid()
      and coalesce(assignment.assignment_status, '') <> 'cancelled'
  )
);


-- Assigned technicians may update their own draft or rejected submission.
-- Office roles may update any completion record.
drop policy if exists
  "Technicians and office update job completions"
  on public.job_completions;

create policy
  "Technicians and office update job completions"
on public.job_completions
for update
to authenticated
using (
  (
    submitted_by = auth.uid()
    and status in ('draft', 'rejected')
    and exists (
      select 1
      from public.job_assignments assignment
      where assignment.job_id = job_completions.job_id
        and assignment.user_id = auth.uid()
        and coalesce(assignment.assignment_status, '') <> 'cancelled'
    )
  )
  or exists (
    select 1
    from public.app_user_roles role_record
    where role_record.user_id = auth.uid()
      and role_record.role in (
        'administrator',
        'service_manager',
        'admin',
        'manager',
        'owner',
        'office'
      )
  )
)
with check (
  (
    submitted_by = auth.uid()
    and status in ('draft', 'submitted', 'rejected')
  )
  or exists (
    select 1
    from public.app_user_roles role_record
    where role_record.user_id = auth.uid()
      and role_record.role in (
        'administrator',
        'service_manager',
        'admin',
        'manager',
        'owner',
        'office'
      )
  )
);