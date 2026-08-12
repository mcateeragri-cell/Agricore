-- AgriCore v1.3 growth features
-- Global Search, custom dashboard layouts, AI diagnostics entitlement,
-- and Enterprise Machinery Sales CRM.

begin;

-- -----------------------------------------------------
-- Feature catalogue / subscription entitlements
-- -----------------------------------------------------
insert into public.platform_features
  (feature_key, feature_name, description, default_enabled)
values
  ('global_search', 'Global Search', 'Search customers, machines, jobs, quotes, invoices, stock and users from anywhere.', true),
  ('dashboard_builder', 'Dashboard Builder', 'Allow users to customise their AgriCore dashboard layout.', true),
  ('machinery_sales_crm', 'Machinery Sales CRM', 'Enterprise machinery sales, stock, trade-in and pipeline management.', false)
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description;

-- AI Diagnostics is now a released Professional capability.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select p.id, f.feature_key,
  case
    when p.slug in ('professional', 'enterprise') and f.feature_key = 'ai_diagnostics' then true
    when p.slug = 'enterprise' and f.feature_key = 'machinery_sales_crm' then true
    when f.feature_key in ('global_search', 'dashboard_builder') then true
    else false
  end
from public.subscription_plans p
join public.platform_features f
  on f.feature_key in ('global_search', 'dashboard_builder', 'ai_diagnostics', 'machinery_sales_crm')
where p.slug in ('starter', 'professional', 'enterprise')
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- -----------------------------------------------------
-- Dashboard layouts (per user / per company)
-- -----------------------------------------------------
create table if not exists public.company_dashboard_layouts (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  layout jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.company_dashboard_layouts enable row level security;
revoke all on public.company_dashboard_layouts from anon;

-- -----------------------------------------------------
-- Machinery Sales CRM
-- -----------------------------------------------------
create table if not exists public.sales_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  stage text not null default 'lead',
  source text,
  estimated_value numeric(12,2) not null default 0,
  probability integer not null default 10,
  assigned_to text,
  expected_close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_opportunities_stage_check check (
    stage in ('lead','qualified','quoted','negotiation','won','lost')
  ),
  constraint sales_opportunities_probability_check check (
    probability between 0 and 100
  )
);

create index if not exists sales_opportunities_company_stage_idx
  on public.sales_opportunities(company_id, stage);

create table if not exists public.sales_stock_machines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_number text,
  make text not null,
  model text not null,
  machine_type text,
  year integer,
  registration text,
  serial_number text,
  hours numeric(12,1),
  condition text not null default 'used',
  cost_price numeric(12,2) not null default 0,
  asking_price numeric(12,2) not null default 0,
  status text not null default 'available',
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_stock_condition_check check (condition in ('new','used','ex-demo')),
  constraint sales_stock_status_check check (status in ('available','reserved','sold','workshop','incoming'))
);

create index if not exists sales_stock_machines_company_status_idx
  on public.sales_stock_machines(company_id, status);

create table if not exists public.sales_trade_ins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid references public.sales_opportunities(id) on delete cascade,
  customer_machine_id uuid references public.machines(id) on delete set null,
  make text not null,
  model text not null,
  year integer,
  registration text,
  serial_number text,
  hours numeric(12,1),
  valuation numeric(12,2) not null default 0,
  allowance numeric(12,2) not null default 0,
  status text not null default 'appraising',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_trade_ins_status_check check (status in ('appraising','offered','accepted','declined','received'))
);

create index if not exists sales_trade_ins_company_idx
  on public.sales_trade_ins(company_id, status);

alter table public.sales_opportunities enable row level security;
alter table public.sales_stock_machines enable row level security;
alter table public.sales_trade_ins enable row level security;
revoke all on public.sales_opportunities from anon;
revoke all on public.sales_stock_machines from anon;
revoke all on public.sales_trade_ins from anon;

-- Sales permissions are company-role permissions, separate from subscription entitlement.
insert into public.app_permissions (permission_key, name, description, module)
values
  ('sales.view', 'View machinery sales', 'View machinery sales pipeline, stock and trade-ins.', 'sales'),
  ('sales.manage', 'Manage machinery sales', 'Create and manage sales opportunities, stock machines and trade-ins.', 'sales')
on conflict (permission_key) do nothing;

-- Seed sensible defaults for current companies. Company admins are protected in application code.
insert into public.company_role_permissions (company_id, role, permission_key, allowed)
select c.id, r.role, p.permission_key,
  case
    when r.role in ('company_admin','administrator','service_manager','office') then true
    else false
  end
from public.companies c
cross join (values
  ('company_admin'), ('administrator'), ('service_manager'), ('office'),
  ('parts_manager'), ('technician'), ('apprentice'), ('read_only')
) as r(role)
cross join (values ('sales.view'), ('sales.manage')) as p(permission_key)
on conflict (company_id, role, permission_key) do update set allowed = excluded.allowed;

commit;
