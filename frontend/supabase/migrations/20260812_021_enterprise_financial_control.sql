-- AgriCore UI Refresh / Commercial Packaging
-- Advanced Financial Control is an Enterprise-only entitlement.

begin;

insert into public.platform_features
  (feature_key, feature_name, description, default_enabled)
values
  (
    'financial_control',
    'Financial Control',
    'Advanced purchase ledger, bank reconciliation, finance controls, accountant workspace and statutory financial reporting.',
    false
  )
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description,
    default_enabled = excluded.default_enabled;

insert into public.subscription_plan_features
  (plan_id, feature_key, enabled)
select
  p.id,
  'financial_control',
  case when p.slug = 'enterprise' then true else false end
from public.subscription_plans p
where p.slug in ('starter', 'professional', 'enterprise')
on conflict (plan_id, feature_key) do update
set enabled = excluded.enabled;

commit;
