-- AgriCore v1.2 - Stripe subscription billing for AgriCore SaaS fees.
-- This remains completely separate from each tenant's own customer-invoice payment provider.

alter table public.company_subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists current_period_ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists checkout_completed_at timestamptz;

create index if not exists company_subscriptions_payment_customer_idx
  on public.company_subscriptions(payment_customer_id)
  where payment_customer_id is not null;

create unique index if not exists company_subscriptions_payment_subscription_unique
  on public.company_subscriptions(payment_subscription_id)
  where payment_subscription_id is not null;

-- Launch price for the single Professional plan.
update public.subscription_plans
set monthly_price = 89.00,
    trial_days = 14,
    is_active = true,
    updated_at = now()
where slug = 'professional';

alter table public.company_subscriptions enable row level security;

drop policy if exists "Company administrators view subscription"
  on public.company_subscriptions;

create policy "Company administrators view subscription"
on public.company_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_member_roles role_row
    where role_row.company_id = company_subscriptions.company_id
      and role_row.user_id = auth.uid()
      and role_row.role in ('company_admin', 'administrator')
  )
);
