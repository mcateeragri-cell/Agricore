-- AgriCore Enterprise Multi-Branch Foundation
-- Adds depots/branches without breaking existing single-branch companies.

begin;

insert into public.platform_features (feature_key, feature_name, description, default_enabled)
values (
  'multi_branch',
  'Multi-branch management',
  'Enterprise branch/depot management, branch-aware access scopes and consolidated reporting foundations.',
  false
)
on conflict (feature_key) do update
set feature_name = excluded.feature_name,
    description = excluded.description;

-- Multi-branch is Enterprise-only. Internal/demo companies remain enabled by the
-- effective-feature engine as before.
insert into public.subscription_plan_features (plan_id, feature_key, enabled)
select id, 'multi_branch', slug = 'enterprise'
from public.subscription_plans
where slug in ('starter','professional','enterprise')
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

create table if not exists public.company_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  branch_type text not null default 'depot',
  is_head_office boolean not null default false,
  address text,
  phone text,
  email text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_branches_type_check check (branch_type in ('head_office','depot','workshop','parts')),
  constraint company_branches_company_code_unique unique (company_id, code)
);

create unique index if not exists company_branches_one_head_office_idx
  on public.company_branches(company_id)
  where is_head_office = true and active = true;

create index if not exists company_branches_company_active_idx
  on public.company_branches(company_id, active, sort_order, name);

-- Every existing company receives one invisible/default operational branch so all
-- pre-existing records can be made branch-aware without changing current UX.
insert into public.company_branches (
  company_id, code, name, branch_type, is_head_office, sort_order
)
select c.id, 'MAIN', 'Main Depot', 'head_office', true, 0
from public.companies c
where not exists (
  select 1 from public.company_branches b where b.company_id = c.id
);

create table if not exists public.company_member_branch_scopes (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  home_branch_id uuid references public.company_branches(id) on delete set null,
  operations_scope text not null default 'branch',
  finance_scope text not null default 'branch',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id),
  constraint company_member_branch_operations_scope_check
    check (operations_scope in ('own_jobs','branch','selected','company')),
  constraint company_member_branch_finance_scope_check
    check (finance_scope in ('none','branch','selected','company'))
);

create table if not exists public.company_member_branch_access (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid not null references public.company_branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id, branch_id)
);

create index if not exists company_member_branch_access_user_idx
  on public.company_member_branch_access(company_id, user_id, branch_id);

-- Seed sensible scopes from current roles. These scopes constrain data visibility;
-- they do not grant permissions that the user's role does not already have.
insert into public.company_member_branch_scopes (
  company_id, user_id, home_branch_id, operations_scope, finance_scope
)
select
  cm.company_id,
  cm.user_id,
  b.id,
  case
    when cmr.role in ('company_admin','administrator') then 'company'
    when cmr.role in ('technician','apprentice') then 'own_jobs'
    else 'branch'
  end,
  case
    when cmr.role in ('company_admin','administrator') then 'company'
    when cmr.role in ('technician','apprentice') then 'none'
    else 'branch'
  end
from public.company_members cm
left join public.company_member_roles cmr
  on cmr.company_id = cm.company_id and cmr.user_id = cm.user_id
join lateral (
  select id
  from public.company_branches b0
  where b0.company_id = cm.company_id and b0.active = true
  order by b0.is_head_office desc, b0.sort_order asc, b0.created_at asc
  limit 1
) b on true
where cm.is_active = true
on conflict (company_id, user_id) do nothing;

insert into public.company_member_branch_access (company_id, user_id, branch_id)
select company_id, user_id, home_branch_id
from public.company_member_branch_scopes
where home_branch_id is not null
on conflict do nothing;

-- Core records gain a nullable branch_id. A trigger assigns the company's default
-- branch whenever legacy code does not yet provide one, preserving backwards compatibility.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers','machines','jobs','quotes','invoices','stock_items','stock_movements',
    'purchase_orders','finance_journals','finance_credit_notes','sales_opportunities','sales_stock_machines'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I add column if not exists branch_id uuid references public.company_branches(id) on delete restrict', table_name);
      execute format('create index if not exists %I on public.%I(company_id, branch_id)', table_name || '_company_branch_idx', table_name);
    end if;
  end loop;
end $$;

create or replace function public.agricore_assign_company_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_branch uuid;
begin
  if new.company_id is null then
    return new;
  end if;

  if new.branch_id is not null then
    if not exists (
      select 1 from public.company_branches b
      where b.id = new.branch_id and b.company_id = new.company_id and b.active = true
    ) then
      raise exception 'Branch does not belong to the record company or is inactive.';
    end if;
    return new;
  end if;

  select b.id into resolved_branch
  from public.company_branches b
  where b.company_id = new.company_id and b.active = true
  order by b.is_head_office desc, b.sort_order asc, b.created_at asc
  limit 1;

  new.branch_id := resolved_branch;
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'customers','machines','jobs','quotes','invoices','stock_items','stock_movements',
    'purchase_orders','finance_journals','finance_credit_notes','sales_opportunities','sales_stock_machines'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      trigger_name := 'agricore_assign_branch_' || table_name;
      execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
      execute format(
        'create trigger %I before insert or update of company_id, branch_id on public.%I for each row execute function public.agricore_assign_company_branch()',
        trigger_name, table_name
      );

      execute format($sql$
        update public.%I r
        set branch_id = (
          select b0.id
          from public.company_branches b0
          where b0.company_id = r.company_id and b0.active = true
          order by b0.is_head_office desc, b0.sort_order asc, b0.created_at asc
          limit 1
        )
        where r.branch_id is null
      $sql$, table_name);
    end if;
  end loop;
end $$;

alter table public.company_branches enable row level security;
alter table public.company_member_branch_scopes enable row level security;
alter table public.company_member_branch_access enable row level security;

-- Members may read their company's branch structure. Writes go through protected
-- server routes using the service role so branch administration remains permission-gated.
drop policy if exists "Company members read branches" on public.company_branches;
create policy "Company members read branches"
on public.company_branches for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_branches.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Members read own branch scopes" on public.company_member_branch_scopes;
create policy "Members read own branch scopes"
on public.company_member_branch_scopes for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.company_member_roles r
    where r.company_id = company_member_branch_scopes.company_id
      and r.user_id = auth.uid()
      and r.role in ('company_admin','administrator')
  )
);

drop policy if exists "Members read own branch access" on public.company_member_branch_access;
create policy "Members read own branch access"
on public.company_member_branch_access for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.company_member_roles r
    where r.company_id = company_member_branch_access.company_id
      and r.user_id = auth.uid()
      and r.role in ('company_admin','administrator')
  )
);

commit;
