begin;

create table if not exists public.company_email_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  provider text not null default 'resend',
  sender_name text,
  reply_to_email text,
  from_email text,
  custom_sender_verified boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_email_settings_provider_check check (provider in ('resend'))
);

create table if not exists public.company_email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_key text not null,
  subject_template text,
  body_template text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, template_key)
);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  provider text not null default 'resend',
  provider_message_id text,
  template_key text,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  status text not null default 'queued',
  related_entity_type text,
  related_entity_id uuid,
  idempotency_key text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint email_messages_status_check check (status in ('queued','sent','delivered','delayed','failed','bounced','complained','suppressed'))
);

create unique index if not exists email_messages_idempotency_key_unique
  on public.email_messages(idempotency_key)
  where idempotency_key is not null;
create unique index if not exists email_messages_provider_message_id_unique
  on public.email_messages(provider_message_id)
  where provider_message_id is not null;
create index if not exists email_messages_company_created_idx
  on public.email_messages(company_id, created_at desc);
create index if not exists email_messages_recipient_idx
  on public.email_messages(lower(recipient_email));

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  email text not null,
  reason text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique(company_id, email)
);

create table if not exists public.resend_webhook_events (
  event_id text primary key,
  event_type text not null,
  provider_message_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

insert into public.company_email_settings (company_id, sender_name, reply_to_email)
select cs.company_id,
       coalesce(nullif(cs.company_name,''), c.company_name),
       cs.email
from public.company_settings cs
join public.companies c on c.id = cs.company_id
on conflict (company_id) do nothing;

alter table public.company_email_settings enable row level security;
alter table public.company_email_templates enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_suppressions enable row level security;

-- Company members can read communication data; write access is limited to settings managers via server APIs.
drop policy if exists "Company members read email settings" on public.company_email_settings;
create policy "Company members read email settings" on public.company_email_settings
for select to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = company_email_settings.company_id and cm.user_id = auth.uid() and cm.is_active = true)
);

drop policy if exists "Company members read email templates" on public.company_email_templates;
create policy "Company members read email templates" on public.company_email_templates
for select to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = company_email_templates.company_id and cm.user_id = auth.uid() and cm.is_active = true)
);

drop policy if exists "Company members read email messages" on public.email_messages;
create policy "Company members read email messages" on public.email_messages
for select to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = email_messages.company_id and cm.user_id = auth.uid() and cm.is_active = true)
);

drop policy if exists "Company members read email suppressions" on public.email_suppressions;
create policy "Company members read email suppressions" on public.email_suppressions
for select to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = email_suppressions.company_id and cm.user_id = auth.uid() and cm.is_active = true)
);

grant select on public.company_email_settings, public.company_email_templates, public.email_messages, public.email_suppressions to authenticated;

commit;
