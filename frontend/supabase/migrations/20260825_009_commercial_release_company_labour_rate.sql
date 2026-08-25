begin;
alter table public.company_settings
  add column if not exists default_hourly_rate numeric(10,2) not null default 65
  check (default_hourly_rate >= 0);
comment on column public.company_settings.default_hourly_rate is
  'Company-specific default selling rate used for newly created workshop labour entries.';
commit;
