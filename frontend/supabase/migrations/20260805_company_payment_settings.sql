begin;

create table if not exists public.company_payment_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  provider text not null default 'none' check (provider in ('none', 'bank_transfer', 'revolut')),
  bank_name text,
  account_name text,
  sort_code text,
  account_number text,
  iban text,
  bic text,
  payment_instructions text,
  revolut_environment text not null default 'sandbox' check (revolut_environment in ('sandbox', 'production')),
  revolut_api_version text not null default '2026-04-20',
  revolut_public_key text,
  revolut_secret_key_encrypted text,
  revolut_webhook_secret_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_payment_settings enable row level security;

drop policy if exists "Company members can view payment settings" on public.company_payment_settings;
create policy "Company members can view payment settings"
on public.company_payment_settings for select to authenticated
using (exists (
  select 1 from public.company_members cm
  where cm.company_id = company_payment_settings.company_id
    and cm.user_id = auth.uid() and cm.is_active = true
));

drop policy if exists "Company administrators can manage payment settings" on public.company_payment_settings;
create policy "Company administrators can manage payment settings"
on public.company_payment_settings for all to authenticated
using (exists (
  select 1 from public.company_member_roles r
  where r.company_id = company_payment_settings.company_id
    and r.user_id = auth.uid()
    and r.role in ('company_admin', 'administrator')
))
with check (exists (
  select 1 from public.company_member_roles r
  where r.company_id = company_payment_settings.company_id
    and r.user_id = auth.uid()
    and r.role in ('company_admin', 'administrator')
));

commit;
