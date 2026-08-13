-- AgriCore Commercial Platform 1.0
-- Public Starter / Professional / Enterprise pricing, entitlements and AI usage metering.

begin;

update public.subscription_plans
set monthly_price = 49.00,
    yearly_price = 490.00,
    max_users = 2,
    max_storage_gb = 10,
    trial_days = 14,
    currency_code = 'GBP',
    tax_behaviour = 'exclusive',
    is_active = true,
    is_public = true,
    sort_order = 10,
    updated_at = now()
where slug = 'starter';

update public.subscription_plans
set monthly_price = 89.00,
    yearly_price = 890.00,
    max_users = 9999,
    max_storage_gb = 100,
    trial_days = 14,
    currency_code = 'GBP',
    tax_behaviour = 'exclusive',
    is_active = true,
    is_public = true,
    sort_order = 20,
    updated_at = now()
where slug = 'professional';

update public.subscription_plans
set monthly_price = 225.00,
    yearly_price = 2250.00,
    max_users = 9999,
    max_storage_gb = 1000,
    trial_days = 14,
    currency_code = 'GBP',
    tax_behaviour = 'exclusive',
    is_active = true,
    is_public = true,
    sort_order = 30,
    updated_at = now()
where slug = 'enterprise';

-- Starter: core day-to-day workflow, service programmes and limited AI diagnostics.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key,
  f.feature_key in (
    'customers','machines','jobs','quotes','invoices','calendar','stock',
    'service_programmes','global_search','ai_diagnostics'
  )
from public.subscription_plans p
cross join public.platform_features f
where p.slug = 'starter'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Professional: complete operational product, excluding Enterprise-only modules.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key,
  case
    when f.feature_key in (
      'financial_control','api_access','machinery_sales_crm','atlas_enterprise_network'
    ) then false
    when f.feature_key in ('customer_portal','fleet_management') then false
    else true
  end
from public.subscription_plans p
cross join public.platform_features f
where p.slug = 'professional'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Enterprise: all released platform capabilities.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key,
  f.feature_key not in ('customer_portal','fleet_management')
from public.subscription_plans p
cross join public.platform_features f
where p.slug = 'enterprise'
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

create table if not exists public.company_ai_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  usage_type text not null default 'diagnostic',
  model text,
  created_at timestamptz not null default now()
);

create index if not exists company_ai_usage_company_month_idx
  on public.company_ai_usage(company_id, created_at desc);

alter table public.company_ai_usage enable row level security;
revoke all on public.company_ai_usage from anon, authenticated;

commit;
