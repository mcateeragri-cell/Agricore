-- AgriCore Project Atlas v1.5 / v2.0 foundation
-- Workshop intelligence, event capture, workflow automation and opt-in enterprise network.
-- Deliberately excludes machine health scoring.

begin;

insert into public.platform_features (feature_key, feature_name, description, default_enabled)
values
  ('atlas_intelligence', 'AgriCore Intelligence', 'Profitability, fleet intelligence, predictive maintenance patterns, service forecasting and business advice.', false),
  ('atlas_automations', 'Atlas Automations', 'Rule-based workshop alerts and workflow automation.', false),
  ('atlas_enterprise_network', 'Enterprise Dealer Network', 'Opt-in dealer campaigns, marketplace publishing and anonymous benchmark foundations.', false)
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description;

insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key,
  case
    when p.slug in ('professional','enterprise') and f.feature_key in ('atlas_intelligence','atlas_automations') then true
    when p.slug = 'enterprise' and f.feature_key = 'atlas_enterprise_network' then true
    else false
  end
from public.subscription_plans p
join public.platform_features f on f.feature_key in ('atlas_intelligence','atlas_automations','atlas_enterprise_network')
where p.slug in ('starter','professional','enterprise')
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

create table if not exists public.atlas_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists atlas_events_company_time_idx on public.atlas_events(company_id, occurred_at desc);
create index if not exists atlas_events_company_type_idx on public.atlas_events(company_id, event_type);
alter table public.atlas_events enable row level security;
revoke all on public.atlas_events from anon;

create table if not exists public.atlas_automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rule_type text not null,
  enabled boolean not null default true,
  threshold numeric(14,2) not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_automation_rule_type_check check (rule_type in ('service_due','quote_stale','low_stock','job_completed_uninvoiced','high_parts_cost'))
);
create index if not exists atlas_automation_rules_company_idx on public.atlas_automation_rules(company_id, enabled);
alter table public.atlas_automation_rules enable row level security;
revoke all on public.atlas_automation_rules from anon;

create table if not exists public.atlas_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rule_id uuid references public.atlas_automation_rules(id) on delete set null,
  severity text not null default 'info',
  title text not null,
  detail text not null,
  href text,
  fingerprint text not null,
  status text not null default 'open',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint atlas_alert_severity_check check (severity in ('info','attention','opportunity')),
  constraint atlas_alert_status_check check (status in ('open','resolved','dismissed')),
  unique(company_id, fingerprint)
);
create index if not exists atlas_alerts_company_status_idx on public.atlas_alerts(company_id, status, last_seen_at desc);
alter table public.atlas_alerts enable row level security;
revoke all on public.atlas_alerts from anon;

create table if not exists public.enterprise_network_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  network_opt_in boolean not null default false,
  marketplace_opt_in boolean not null default false,
  benchmark_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.enterprise_network_settings enable row level security;
revoke all on public.enterprise_network_settings from anon;

create table if not exists public.marketplace_machine_listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_machine_id uuid not null references public.sales_stock_machines(id) on delete cascade,
  published boolean not null default false,
  headline text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, stock_machine_id)
);
create index if not exists marketplace_machine_listings_company_idx on public.marketplace_machine_listings(company_id, published);
alter table public.marketplace_machine_listings enable row level security;
revoke all on public.marketplace_machine_listings from anon;

create table if not exists public.marketplace_part_listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  published boolean not null default false,
  quantity_available numeric(14,3) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, stock_item_id)
);
create index if not exists marketplace_part_listings_company_idx on public.marketplace_part_listings(company_id, published);
alter table public.marketplace_part_listings enable row level security;
revoke all on public.marketplace_part_listings from anon;

create table if not exists public.dealer_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  manufacturer text,
  campaign_type text not null default 'service_campaign',
  reference text,
  description text,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_campaign_status_check check (status in ('draft','active','completed','cancelled'))
);
create index if not exists dealer_campaigns_company_status_idx on public.dealer_campaigns(company_id, status);
alter table public.dealer_campaigns enable row level security;
revoke all on public.dealer_campaigns from anon;

-- Capture important operational changes as immutable company events. The trigger stores
-- a compact row snapshot and runs entirely inside Postgres, so Atlas can evolve without
-- adding duplicate event-writing code to every API route.
create or replace function public.atlas_capture_row_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  company uuid;
  entity text;
  action text;
begin
  row_data := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  begin company := nullif(row_data ->> 'company_id','')::uuid; exception when others then company := null; end;
  if company is null then
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;
  entity := coalesce(row_data ->> 'id', row_data ->> 'job_id', row_data ->> 'machine_id');
  action := lower(TG_TABLE_NAME || '.' || TG_OP);
  insert into public.atlas_events(company_id,event_type,entity_type,entity_id,payload)
  values(company, action, TG_TABLE_NAME, entity, row_data - 'company_id');
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;

-- Attach triggers only to tables that exist in this AgriCore installation.
do $$
declare
  t text;
begin
  foreach t in array array['jobs','invoices','quotes','job_parts_used','stock_movements','machine_service_programmes','sales_opportunities']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists atlas_event_capture on public.%I', t);
      execute format('create trigger atlas_event_capture after insert or update or delete on public.%I for each row execute function public.atlas_capture_row_event()', t);
    end if;
  end loop;
end $$;

commit;
