-- AgriCore Platform Pack 2C — Global Tax Engine & Financial Validation
-- Adds jurisdiction-neutral tax periods/rate history, finance validation and controlled reversals.

begin;

-- Finance permissions are capability based so an accountant preset can be introduced
-- without coupling the ledger to a hard-coded company role.
insert into public.app_permissions(permission_key, name, description, module)
values
  ('finance.view','View finance','View Atlas Finance configuration, journals and validation.','finance'),
  ('finance.manage','Manage finance','Manage finance profiles, tax codes and periods.','finance'),
  ('finance.tax','Manage tax','Manage tax periods, codes and review tax validation.','finance'),
  ('finance.reports','View finance reports','View finance reports and accountant-ready outputs.','finance'),
  ('finance.post','Post finance journals','Create controlled ledger postings and reversals.','finance')
on conflict (permission_key) do nothing;

insert into public.company_role_permissions(company_id, role, permission_key, allowed)
select c.id, r.role, p.permission_key,
  case
    when r.role in ('company_admin','administrator') then true
    when r.role in ('service_manager','office') and p.permission_key in ('finance.view','finance.reports') then true
    else false
  end
from public.companies c
cross join (values
  ('company_admin'),('administrator'),('service_manager'),('office'),
  ('parts_manager'),('technician'),('apprentice'),('read_only')
) r(role)
cross join (values
  ('finance.view'),('finance.manage'),('finance.tax'),('finance.reports'),('finance.post')
) p(permission_key)
on conflict (company_id, role, permission_key) do update set allowed = excluded.allowed;

-- Jurisdiction-neutral tax filing settings. We intentionally do not seed statutory
-- rates/deadlines because those are jurisdiction-specific and can change over time.
create table if not exists public.finance_tax_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  jurisdiction_code text,
  registration_number text,
  filing_frequency text not null default 'manual',
  prices_include_tax boolean not null default false,
  reporting_currency_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_tax_settings_jurisdiction_check check (jurisdiction_code is null or jurisdiction_code ~ '^[A-Z0-9_-]{2,24}$'),
  constraint finance_tax_settings_currency_check check (reporting_currency_code is null or reporting_currency_code ~ '^[A-Z]{3}$'),
  constraint finance_tax_settings_frequency_check check (filing_frequency in ('manual','monthly','quarterly','annual','custom'))
);

create table if not exists public.finance_tax_code_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_code_id uuid not null references public.finance_tax_codes(id) on delete cascade,
  rate numeric(9,4) not null,
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(company_id, tax_code_id, effective_from),
  constraint finance_tax_code_rates_rate_check check (rate >= 0 and rate <= 100),
  constraint finance_tax_code_rates_dates_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists finance_tax_code_rates_lookup_idx
  on public.finance_tax_code_rates(company_id, tax_code_id, effective_from desc);

create table if not exists public.finance_tax_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open',
  prepared_at timestamptz,
  prepared_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  locked_at timestamptz,
  locked_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, starts_on, ends_on),
  constraint finance_tax_periods_dates_check check (ends_on >= starts_on),
  constraint finance_tax_periods_status_check check (status in ('open','prepared','reviewed','locked'))
);

create index if not exists finance_tax_periods_company_idx
  on public.finance_tax_periods(company_id, starts_on desc, ends_on desc);

create table if not exists public.finance_validation_issues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  issue_key text not null,
  severity text not null,
  category text not null,
  entity_type text,
  entity_id text,
  title text not null,
  detail text,
  status text not null default 'open',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(company_id, issue_key),
  constraint finance_validation_severity_check check (severity in ('info','warning','error','critical')),
  constraint finance_validation_status_check check (status in ('open','resolved'))
);

create index if not exists finance_validation_company_idx
  on public.finance_validation_issues(company_id, status, severity, last_seen_at desc);

-- Reversal metadata gives accountants an explicit link between original and reversing journals.
alter table public.finance_journals
  add column if not exists reversal_reason text;

create or replace function public.finance_reverse_journal(
  p_company_id uuid,
  p_journal_id uuid,
  p_reversal_date date,
  p_reason text,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.finance_journals%rowtype;
  v_existing uuid;
  v_period_id uuid;
  v_reversal_id uuid;
  v_source_action text;
begin
  select * into v_original
  from public.finance_journals
  where id = p_journal_id and company_id = p_company_id
  for update;

  if not found then raise exception 'Finance journal was not found.'; end if;
  if v_original.status not in ('posted','reversed') then raise exception 'Only posted journals can be reversed.'; end if;

  v_source_action := 'reversal:' || p_journal_id::text;
  select id into v_existing from public.finance_journals
   where company_id=p_company_id and source_type='journal_reversal'
     and source_id=p_journal_id::text and source_action=v_source_action limit 1;
  if v_existing is not null then return v_existing; end if;

  select id into v_period_id from public.finance_periods
   where company_id=p_company_id and p_reversal_date between starts_on and ends_on and status='open'
   order by starts_on desc limit 1;
  if v_period_id is null then raise exception 'No open financial period contains reversal date %.', p_reversal_date; end if;

  insert into public.finance_journals(
    company_id, period_id, journal_date, status, source_type, source_id, source_action,
    source_event_id, reference, description, currency_code, exchange_rate, posted_at,
    reversal_of, reversal_reason, metadata
  ) values (
    p_company_id, v_period_id, p_reversal_date, 'posted', 'journal_reversal', p_journal_id::text, v_source_action,
    p_source_event_id, coalesce(v_original.reference,'') || ' REV',
    'Reversal of ' || coalesce(v_original.description, v_original.reference, p_journal_id::text),
    v_original.currency_code, v_original.exchange_rate, now(), p_journal_id,
    nullif(trim(p_reason),''), jsonb_build_object('original_journal_id',p_journal_id)
  ) returning id into v_reversal_id;

  insert into public.finance_journal_lines(
    journal_id, company_id, account_id, tax_code_id, description, debit, credit, tax_amount, metadata
  )
  select v_reversal_id, company_id, account_id, tax_code_id,
         coalesce(description,'') || ' (reversal)', credit, debit, tax_amount,
         coalesce(metadata,'{}'::jsonb) || jsonb_build_object('reversal_of_line_id',id)
  from public.finance_journal_lines
  where journal_id=p_journal_id;

  update public.finance_journals
     set status='reversed', updated_at=now(), reversal_reason=coalesce(reversal_reason,p_reason)
   where id=p_journal_id;

  return v_reversal_id;
end;
$$;
revoke all on function public.finance_reverse_journal(uuid,uuid,date,text,uuid) from public, anon, authenticated;
grant execute on function public.finance_reverse_journal(uuid,uuid,date,text,uuid) to service_role;

-- Server-side validator. It refreshes current open issues and resolves issues no longer present.
create or replace function public.finance_validate_company(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seen text[] := array[]::text[];
  v_key text;
  v_count integer := 0;
  r record;
begin
  -- Unbalanced posted journals (should normally be impossible; detects manual/import corruption).
  for r in
    select j.id, coalesce(j.reference,j.id::text) reference,
           round(coalesce(sum(l.debit),0),2) debits,
           round(coalesce(sum(l.credit),0),2) credits
    from public.finance_journals j
    left join public.finance_journal_lines l on l.journal_id=j.id
    where j.company_id=p_company_id and j.status in ('posted','reversed')
    group by j.id
    having abs(round(coalesce(sum(l.debit),0),2)-round(coalesce(sum(l.credit),0),2)) > 0.01
  loop
    v_key := 'unbalanced_journal:'||r.id::text; v_seen := array_append(v_seen,v_key); v_count:=v_count+1;
    insert into public.finance_validation_issues(company_id,issue_key,severity,category,entity_type,entity_id,title,detail,last_seen_at,status,resolved_at)
    values(p_company_id,v_key,'critical','ledger','journal',r.id::text,'Unbalanced journal',format('%s: debits %s, credits %s',r.reference,r.debits,r.credits),now(),'open',null)
    on conflict(company_id,issue_key) do update set severity='critical',detail=excluded.detail,last_seen_at=now(),status='open',resolved_at=null;
  end loop;

  -- Posted journals outside their linked period or linked to a non-open period at posting time.
  for r in
    select j.id, coalesce(j.reference,j.id::text) reference
    from public.finance_journals j
    left join public.finance_periods p on p.id=j.period_id
    where j.company_id=p_company_id and j.status in ('posted','reversed')
      and (p.id is null or j.journal_date < p.starts_on or j.journal_date > p.ends_on)
  loop
    v_key := 'invalid_period:'||r.id::text; v_seen := array_append(v_seen,v_key); v_count:=v_count+1;
    insert into public.finance_validation_issues(company_id,issue_key,severity,category,entity_type,entity_id,title,detail,last_seen_at,status,resolved_at)
    values(p_company_id,v_key,'error','period','journal',r.id::text,'Journal period mismatch',r.reference||' is not contained by its financial period.',now(),'open',null)
    on conflict(company_id,issue_key) do update set detail=excluded.detail,last_seen_at=now(),status='open',resolved_at=null;
  end loop;

  -- Tax-bearing lines without a tax code.
  for r in
    select l.id, j.id journal_id, coalesce(j.reference,j.id::text) reference
    from public.finance_journal_lines l
    join public.finance_journals j on j.id=l.journal_id
    where l.company_id=p_company_id and l.tax_amount > 0 and l.tax_code_id is null
  loop
    v_key := 'tax_code_missing:'||r.id::text; v_seen := array_append(v_seen,v_key); v_count:=v_count+1;
    insert into public.finance_validation_issues(company_id,issue_key,severity,category,entity_type,entity_id,title,detail,last_seen_at,status,resolved_at)
    values(p_company_id,v_key,'error','tax','journal',r.journal_id::text,'Tax code missing',r.reference||' has tax value without a tax code.',now(),'open',null)
    on conflict(company_id,issue_key) do update set detail=excluded.detail,last_seen_at=now(),status='open',resolved_at=null;
  end loop;

  -- Finance queue failures are surfaced as finance validation problems too.
  for r in
    select id,last_error from public.atlas_queue
    where company_id=p_company_id and task_type='finance_posting' and status='failed'
  loop
    v_key := 'posting_failed:'||r.id::text; v_seen := array_append(v_seen,v_key); v_count:=v_count+1;
    insert into public.finance_validation_issues(company_id,issue_key,severity,category,entity_type,entity_id,title,detail,last_seen_at,status,resolved_at)
    values(p_company_id,v_key,'error','posting','queue_task',r.id::text,'Finance posting failed',coalesce(r.last_error,'Atlas Finance posting failed.'),now(),'open',null)
    on conflict(company_id,issue_key) do update set detail=excluded.detail,last_seen_at=now(),status='open',resolved_at=null;
  end loop;

  update public.finance_validation_issues
     set status='resolved', resolved_at=now()
   where company_id=p_company_id and status='open'
     and not (issue_key = any(v_seen));

  return v_count;
end;
$$;
revoke all on function public.finance_validate_company(uuid) from public, anon, authenticated;
grant execute on function public.finance_validate_company(uuid) to service_role;

-- Seed current tax-code rates from configured values as a historical starting point.
insert into public.finance_tax_code_rates(company_id,tax_code_id,rate,effective_from)
select tc.company_id,tc.id,tc.rate,current_date
from public.finance_tax_codes tc
on conflict(company_id,tax_code_id,effective_from) do nothing;

insert into public.finance_tax_settings(company_id,jurisdiction_code,reporting_currency_code)
select fp.company_id,fp.country_code,fp.base_currency_code from public.finance_profiles fp
on conflict(company_id) do nothing;

alter table public.finance_tax_settings enable row level security;
alter table public.finance_tax_code_rates enable row level security;
alter table public.finance_tax_periods enable row level security;
alter table public.finance_validation_issues enable row level security;

-- Reuse the same tenant/member security model as the Finance foundation tables.
do $$
declare t text;
begin
  foreach t in array array['finance_tax_settings','finance_tax_code_rates','finance_tax_periods','finance_validation_issues'] loop
    execute format('drop policy if exists "Company members can read %s" on public.%I',t,t);
    execute format('create policy "Company members can read %s" on public.%I for select to authenticated using (exists (select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=auth.uid() and cm.is_active=true))',t,t,t);
    execute format('drop policy if exists "Company administrators can manage %s" on public.%I',t,t);
    execute format('create policy "Company administrators can manage %s" on public.%I for all to authenticated using (exists (select 1 from public.company_member_roles r where r.company_id=%I.company_id and r.user_id=auth.uid() and r.role in (''company_admin'',''administrator''))) with check (exists (select 1 from public.company_member_roles r where r.company_id=%I.company_id and r.user_id=auth.uid() and r.role in (''company_admin'',''administrator'')))',t,t,t,t);
  end loop;
end $$;

revoke all on public.finance_tax_settings from anon;
revoke all on public.finance_tax_code_rates from anon;
revoke all on public.finance_tax_periods from anon;
revoke all on public.finance_validation_issues from anon;

commit;
