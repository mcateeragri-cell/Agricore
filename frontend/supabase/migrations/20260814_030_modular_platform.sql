-- AgriCore Modular Platform Foundation
-- Reuses platform_features/subscription_plan_features/company_features as the
-- entitlement -> company module -> user permission hierarchy.

begin;

insert into public.platform_features (feature_key, feature_name, description, default_enabled)
values
  ('dispatch', 'Dispatch', 'Engineer dispatch and live operational planning.', true),
  ('reports', 'Reports', 'Operational and commercial reports.', true),
  ('communications', 'Communications', 'Transactional email settings, templates and delivery history.', true)
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description;

-- Preserve the currently released product experience. These modules can then be
-- switched off at company level without changing plan entitlement.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key, true
from public.subscription_plans p
join public.platform_features f on f.feature_key in ('dispatch','reports','communications')
where p.slug in ('starter','professional','enterprise')
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

commit;
