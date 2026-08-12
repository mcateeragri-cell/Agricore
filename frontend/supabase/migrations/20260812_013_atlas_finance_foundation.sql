begin;

create table if not exists public.finance_profiles (
  company_id uuid primary key references public.companies(id) on delete cascade,
  country_code text not null default 'GB',
  base_currency_code text not null default 'GBP',
  tax_system text not null default 'vat',
  tax_label text not null default 'VAT',
  accounting_method text not null default 'accrual',
  accounting_standard text not null default 'local',
  financial_year_start_month integer not null default 1,
  financial_year_start_day integer not null default 1,
  chart_template text not null default 'agricore_standard',
  government_connector text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_profiles_country_check check (country_code ~ '^[A-Z]{2}$'),
  constraint finance_profiles_currency_check check (base_currency_code ~ '^[A-Z]{3}$'),
  constraint finance_profiles_method_check check (accounting_method in ('accrual','cash')),
  constraint finance_profiles_month_check check (financial_year_start_month between 1 and 12),
  constraint finance_profiles_day_check check (financial_year_start_day between 1 and 31)
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null,
  normal_balance text not null,
  system_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code),
  unique(company_id, system_key),
  constraint finance_accounts_type_check check (account_type in ('asset','liability','equity','income','expense')),
  constraint finance_accounts_balance_check check (normal_balance in ('debit','credit'))
);

create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open',
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, starts_on, ends_on),
  constraint finance_periods_status_check check (status in ('open','locked','closed')),
  constraint finance_periods_dates_check check (ends_on >= starts_on)
);

create table if not exists public.finance_tax_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  rate numeric(9,4) not null default 0,
  tax_kind text not null default 'standard',
  recoverable boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code),
  constraint finance_tax_codes_rate_check check (rate >= 0 and rate <= 100)
);

create table if not exists public.finance_journals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id uuid references public.finance_periods(id) on delete restrict,
  journal_number text,
  journal_date date not null,
  status text not null default 'draft',
  source_type text,
  source_id text,
  reference text,
  description text,
  currency_code text not null,
  exchange_rate numeric(20,8) not null default 1,
  posted_at timestamptz,
  posted_by uuid,
  reversal_of uuid references public.finance_journals(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, source_type, source_id),
  constraint finance_journals_status_check check (status in ('draft','posted','reversed','void')),
  constraint finance_journals_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint finance_journals_exchange_check check (exchange_rate > 0)
);

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.finance_journals(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  tax_code_id uuid references public.finance_tax_codes(id) on delete restrict,
  description text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint finance_journal_lines_nonnegative_check check (debit >= 0 and credit >= 0 and tax_amount >= 0),
  constraint finance_journal_lines_one_side_check check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists finance_accounts_company_idx on public.finance_accounts(company_id, active, code);
create index if not exists finance_periods_company_idx on public.finance_periods(company_id, starts_on, ends_on);
create index if not exists finance_tax_codes_company_idx on public.finance_tax_codes(company_id, active, code);
create index if not exists finance_journals_company_date_idx on public.finance_journals(company_id, journal_date desc);
create index if not exists finance_journal_lines_journal_idx on public.finance_journal_lines(journal_id);

alter table public.finance_profiles enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_periods enable row level security;
alter table public.finance_tax_codes enable row level security;
alter table public.finance_journals enable row level security;
alter table public.finance_journal_lines enable row level security;

-- Members can read their company's finance foundation. Company administrators can manage it.
do $$
declare t text;
begin
  foreach t in array array['finance_profiles','finance_accounts','finance_periods','finance_tax_codes','finance_journals','finance_journal_lines'] loop
    execute format('drop policy if exists "Company members can read %s" on public.%I', t, t);
    execute format('create policy "Company members can read %s" on public.%I for select to authenticated using (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true))', t, t, t);
    execute format('drop policy if exists "Company administrators can manage %s" on public.%I', t, t);
    execute format('create policy "Company administrators can manage %s" on public.%I for all to authenticated using (exists (select 1 from public.company_member_roles r where r.company_id = %I.company_id and r.user_id = auth.uid() and r.role in (''company_admin'',''administrator''))) with check (exists (select 1 from public.company_member_roles r where r.company_id = %I.company_id and r.user_id = auth.uid() and r.role in (''company_admin'',''administrator'')))', t, t, t, t);
  end loop;
end $$;

revoke all on public.finance_profiles from anon;
revoke all on public.finance_accounts from anon;
revoke all on public.finance_periods from anon;
revoke all on public.finance_tax_codes from anon;
revoke all on public.finance_journals from anon;
revoke all on public.finance_journal_lines from anon;

-- Initialise profiles from the existing global/regional company settings without
-- guessing local statutory year ends or accounting standards.
insert into public.finance_profiles(company_id, country_code, base_currency_code, tax_system, tax_label)
select c.id,
       coalesce(cs.country_code, 'GB'),
       coalesce(cs.currency_code, 'GBP'),
       case
         when lower(coalesce(cs.tax_name, '')) like '%gst%' then 'gst'
         when lower(coalesce(cs.tax_name, '')) like '%sales%' then 'sales_tax'
         when lower(coalesce(cs.tax_name, '')) in ('vat','mwst','iva','tva') then 'vat'
         else 'tax'
       end,
       coalesce(nullif(cs.tax_name, ''), 'Tax')
from public.companies c
left join public.company_settings cs on cs.company_id = c.id
on conflict (company_id) do nothing;

-- Universal starter chart. Future country templates can add/replace accounts via system_key;
-- core posting rules will target system keys rather than account numbers.
insert into public.finance_accounts(company_id, code, name, account_type, normal_balance, system_key)
select c.id, v.code, v.name, v.account_type, v.normal_balance, v.system_key
from public.companies c
cross join (values
  ('1000','Bank','asset','debit','bank'),
  ('1100','Trade receivables','asset','debit','accounts_receivable'),
  ('1200','Inventory','asset','debit','inventory'),
  ('1300','Tax recoverable','asset','debit','tax_recoverable'),
  ('2000','Trade payables','liability','credit','accounts_payable'),
  ('2100','Tax payable','liability','credit','tax_payable'),
  ('3000','Retained earnings','equity','credit','retained_earnings'),
  ('4000','Labour sales','income','credit','labour_sales'),
  ('4010','Parts sales','income','credit','parts_sales'),
  ('4020','Travel and callout sales','income','credit','travel_sales'),
  ('4090','Other sales','income','credit','other_sales'),
  ('5000','Parts cost of sales','expense','debit','parts_cogs'),
  ('5100','Direct labour cost','expense','debit','labour_cost'),
  ('5200','Travel cost','expense','debit','travel_cost'),
  ('6000','Operating expenses','expense','debit','operating_expenses')
) as v(code,name,account_type,normal_balance,system_key)
on conflict (company_id, code) do nothing;

insert into public.finance_tax_codes(company_id, code, name, rate, tax_kind, recoverable)
select c.id, 'STANDARD', coalesce(nullif(cs.tax_name,''),'Tax') || ' standard', coalesce(cs.default_tax_rate,0), 'standard', true
from public.companies c left join public.company_settings cs on cs.company_id=c.id
on conflict (company_id, code) do nothing;
insert into public.finance_tax_codes(company_id, code, name, rate, tax_kind, recoverable)
select id, 'ZERO', 'Zero rated', 0, 'zero', true from public.companies
on conflict (company_id, code) do nothing;
insert into public.finance_tax_codes(company_id, code, name, rate, tax_kind, recoverable)
select id, 'EXEMPT', 'Exempt / non-taxable', 0, 'exempt', false from public.companies
on conflict (company_id, code) do nothing;

-- Create a current 12-month open period as a neutral starter. Companies can edit their
-- financial-year profile before ledger posting is enabled in Pack 2B.
insert into public.finance_periods(company_id, name, starts_on, ends_on)
select id, extract(year from current_date)::text,
       make_date(extract(year from current_date)::int,1,1),
       make_date(extract(year from current_date)::int,12,31)
from public.companies
on conflict (company_id, starts_on, ends_on) do nothing;

comment on table public.finance_profiles is 'Jurisdiction-neutral company finance configuration used by Atlas Finance.';
comment on table public.finance_journals is 'Double-entry journal headers. Operational posting is introduced in Platform Pack 2B.';
comment on table public.finance_journal_lines is 'Double-entry journal lines. Reports must derive from posted journals, not operational tables.';

commit;
