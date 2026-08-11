-- AgriCore RC-1 Commercial Billing
-- Idempotent commercial billing hardening for Stripe-backed SaaS subscriptions.

begin;

alter table public.subscription_plans
  add column if not exists stripe_monthly_price_id text,
  add column if not exists currency_code text not null default 'GBP',
  add column if not exists tax_behaviour text not null default 'exclusive',
  add column if not exists is_public boolean not null default false,
  add column if not exists sort_order integer not null default 100;

update public.subscription_plans
set monthly_price = 49.00,
    trial_days = 14,
    currency_code = coalesce(nullif(currency_code, ''), 'GBP'),
    tax_behaviour = 'exclusive',
    is_public = false,
    sort_order = 10,
    updated_at = now()
where slug = 'starter';

update public.subscription_plans
set monthly_price = 89.00,
    trial_days = 14,
    currency_code = coalesce(nullif(currency_code, ''), 'GBP'),
    tax_behaviour = 'exclusive',
    is_active = true,
    is_public = true,
    sort_order = 20,
    updated_at = now()
where slug = 'professional';

update public.subscription_plans
set currency_code = coalesce(nullif(currency_code, ''), 'GBP'),
    tax_behaviour = 'exclusive',
    is_public = false,
    sort_order = 30,
    updated_at = now()
where slug = 'enterprise';

alter table public.company_subscriptions
  add column if not exists last_invoice_id text,
  add column if not exists last_invoice_status text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists payment_failed_at timestamptz,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists last_stripe_sync_at timestamptz;

create index if not exists company_subscriptions_status_idx
  on public.company_subscriptions(status);

create index if not exists company_subscriptions_trial_ends_idx
  on public.company_subscriptions(trial_ends_at)
  where status = 'trial';

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

-- Future plan/feature entitlement source of truth. Company feature overrides stay separate.
create table if not exists public.subscription_plan_features (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null references public.platform_features(feature_key) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (plan_id, feature_key)
);

alter table public.subscription_plan_features enable row level security;

drop policy if exists "Authenticated users view plan features"
  on public.subscription_plan_features;
create policy "Authenticated users view plan features"
on public.subscription_plan_features
for select
to authenticated
using (true);

-- Professional gets every currently default-enabled operational feature plus field essentials.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select plan.id, feature.feature_key, true
from public.subscription_plans plan
join public.platform_features feature
  on feature.default_enabled = true
  or feature.feature_key in ('offline_mode', 'gps_tracking')
where plan.slug = 'professional'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Explicitly keep unreleased commercial modules off on Professional at launch.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select plan.id, feature.feature_key, false
from public.subscription_plans plan
join public.platform_features feature
  on feature.feature_key in ('ai_diagnostics', 'customer_portal', 'api_access', 'fleet_management')
where plan.slug = 'professional'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Starter is prepared but not publicly sold yet.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select plan.id, feature.feature_key,
  feature.feature_key in ('customers','machines','jobs','quotes','invoices','calendar')
from public.subscription_plans plan
cross join public.platform_features feature
where plan.slug = 'starter'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

commit;
