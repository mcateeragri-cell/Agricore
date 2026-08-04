-- AgriCore v1.4 essential field GPS

alter table public.customers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.job_completions
  add column if not exists completion_latitude double precision,
  add column if not exists completion_longitude double precision,
  add column if not exists completion_location_accuracy_m double precision,
  add column if not exists completion_location_captured_at timestamptz;

create index if not exists job_travel_sessions_company_technician_started_idx
  on public.job_travel_sessions (company_id, technician_user_id, started_at desc);
