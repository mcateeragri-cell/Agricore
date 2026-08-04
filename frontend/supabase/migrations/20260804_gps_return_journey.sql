-- AgriCore v1.4 GPS return-journey extension
-- Safe to run after 20260804_field_gps.sql.

alter table public.job_travel_sessions
  add column if not exists billable boolean not null default true,
  add column if not exists adjustment_reason text,
  add column if not exists last_edited_by uuid,
  add column if not exists last_edited_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

create index if not exists job_travel_sessions_job_direction_idx
  on public.job_travel_sessions (
    company_id,
    job_id,
    direction,
    started_at desc
  );

create index if not exists job_travel_sessions_active_technician_idx
  on public.job_travel_sessions (
    company_id,
    technician_user_id,
    status
  );
