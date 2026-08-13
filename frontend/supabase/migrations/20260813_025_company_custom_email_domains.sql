begin;

alter table public.company_email_settings
  add column if not exists email_mode text not null default 'agricore',
  add column if not exists custom_domain text,
  add column if not exists resend_domain_id text,
  add column if not exists domain_status text,
  add column if not exists domain_records jsonb not null default '[]'::jsonb,
  add column if not exists domain_last_checked_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_email_settings_email_mode_check'
  ) then
    alter table public.company_email_settings
      add constraint company_email_settings_email_mode_check
      check (email_mode in ('agricore', 'custom_domain'));
  end if;
end $$;

create unique index if not exists company_email_settings_resend_domain_id_unique
  on public.company_email_settings(resend_domain_id)
  where resend_domain_id is not null;

create index if not exists company_email_settings_domain_status_idx
  on public.company_email_settings(domain_status)
  where custom_domain is not null;

-- Existing custom verified senders should continue to work after this migration.
update public.company_email_settings
set
  email_mode = case
    when custom_sender_verified = true and from_email is not null
      then 'custom_domain'
    else coalesce(email_mode, 'agricore')
  end,
  custom_domain = case
    when custom_domain is null and from_email like '%@%'
      then lower(split_part(from_email, '@', 2))
    else custom_domain
  end
where true;

commit;
