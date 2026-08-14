-- AgriCore Enterprise Multi-Branch Pack B+C
-- Branch-aware operations, finance scopes and Enterprise depot pricing.

begin;

-- Enterprise is intentionally more accessible while additional depots scale with usage.
update public.subscription_plans
set monthly_price = 149, yearly_price = 1490, stripe_monthly_price_id = null, updated_at = now()
where slug = 'enterprise';

alter table public.subscription_plans
  add column if not exists included_branches integer not null default 1,
  add column if not exists additional_branch_monthly_price numeric not null default 0;
update public.subscription_plans set included_branches=1, additional_branch_monthly_price=30 where slug='enterprise';

-- Calendar/assignment/finance-purchase records become branch aware too.
do $$
declare t text;
begin
  foreach t in array array['job_assignments','staff_calendar_events','finance_purchase_invoices'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists branch_id uuid references public.company_branches(id) on delete restrict',t);
      execute format('create index if not exists %I on public.%I(company_id,branch_id)',t||'_company_branch_idx',t);
    end if;
  end loop;
end $$;

-- Backfill job assignments from their job.
update public.job_assignments a set branch_id=j.branch_id from public.jobs j where a.job_id=j.id and a.branch_id is null;

-- Staff events default to the member's home branch, then company main depot.
update public.staff_calendar_events e
set branch_id=coalesce((select s.home_branch_id from public.company_member_branch_scopes s where s.company_id=e.company_id and s.user_id=e.user_id),
 (select b.id from public.company_branches b where b.company_id=e.company_id and b.active order by b.is_head_office desc,b.sort_order,b.created_at limit 1))
where e.branch_id is null;

-- Purchase invoices default to company main depot.
update public.finance_purchase_invoices p set branch_id=(select b.id from public.company_branches b where b.company_id=p.company_id and b.active order by b.is_head_office desc,b.sort_order,b.created_at limit 1) where p.branch_id is null;

create or replace function public.agricore_assignment_branch() returns trigger language plpgsql security definer set search_path=public as $$
begin
  select branch_id into new.branch_id from public.jobs where id=new.job_id and company_id=new.company_id;
  if new.branch_id is null then raise exception 'Job branch could not be resolved.'; end if; return new;
end $$;
drop trigger if exists agricore_assignment_branch_trigger on public.job_assignments;
create trigger agricore_assignment_branch_trigger before insert or update of job_id,company_id on public.job_assignments for each row execute function public.agricore_assignment_branch();

create or replace function public.agricore_calendar_event_branch() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.branch_id is null then
   select home_branch_id into new.branch_id from public.company_member_branch_scopes where company_id=new.company_id and user_id=new.user_id;
 end if;
 if new.branch_id is null then select id into new.branch_id from public.company_branches where company_id=new.company_id and active order by is_head_office desc,sort_order,created_at limit 1; end if;
 return new;
end $$;
drop trigger if exists agricore_calendar_event_branch_trigger on public.staff_calendar_events;
create trigger agricore_calendar_event_branch_trigger before insert or update of company_id,user_id,branch_id on public.staff_calendar_events for each row execute function public.agricore_calendar_event_branch();

-- Central scope helpers. Security definer lets restrictive policies safely read scope tables.
create or replace function public.agricore_branch_scope_allows(p_company uuid,p_branch uuid,p_area text) returns boolean language plpgsql security definer stable set search_path=public as $$
declare s text; home uuid;
begin
 if auth.uid() is null or p_branch is null then return false; end if;
 select case when p_area='finance' then finance_scope else operations_scope end, home_branch_id into s,home
 from public.company_member_branch_scopes where company_id=p_company and user_id=auth.uid();
 if s='company' then return true; end if;
 if s='selected' then return exists(select 1 from public.company_member_branch_access a where a.company_id=p_company and a.user_id=auth.uid() and a.branch_id=p_branch); end if;
 if s='branch' then return p_branch=home; end if;
 return false;
end $$;

create or replace function public.agricore_own_job_allows(p_company uuid,p_job uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.job_assignments a where a.company_id=p_company and a.job_id=p_job and a.user_id=auth.uid() and coalesce(a.assignment_status,'')<>'cancelled');
$$;

create or replace function public.agricore_own_customer_allows(p_company uuid,p_customer uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.jobs j join public.job_assignments a on a.job_id=j.id and a.company_id=j.company_id where j.company_id=p_company and j.customer_id=p_customer and a.user_id=auth.uid() and coalesce(a.assignment_status,'')<>'cancelled');
$$;

create or replace function public.agricore_own_machine_allows(p_company uuid,p_machine uuid) returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from public.jobs j join public.job_assignments a on a.job_id=j.id and a.company_id=j.company_id where j.company_id=p_company and j.machine_id=p_machine and a.user_id=auth.uid() and coalesce(a.assignment_status,'')<>'cancelled');
$$;

-- Restrictive policies narrow existing company/role policies rather than replacing them.
do $$
declare t text; pol text; expr text;
begin
 foreach t in array array['jobs','customers','machines','quotes','stock_items','stock_movements','purchase_orders'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   if t='jobs' then expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'') or public.agricore_own_job_allows(company_id,id)';
   elsif t='customers' then expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'') or public.agricore_own_customer_allows(company_id,id)';
   elsif t='machines' then expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'') or public.agricore_own_machine_allows(company_id,id)';
   else expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'')'; end if;
   foreach pol in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on public.%I','AgriCore branch '||pol||' '||t,t);
    if pol='select' then execute format('create policy %I on public.%I as restrictive for select to authenticated using (%s)','AgriCore branch '||pol||' '||t,t,expr);
    elsif pol='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.agricore_branch_scope_allows(company_id,branch_id,''operations''))','AgriCore branch '||pol||' '||t,t);
    elsif pol='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using (%s) with check (public.agricore_branch_scope_allows(company_id,branch_id,''operations''))','AgriCore branch '||pol||' '||t,t,expr);
    else execute format('create policy %I on public.%I as restrictive for delete to authenticated using (%s)','AgriCore branch '||pol||' '||t,t,expr); end if;
   end loop;
  end if;
 end loop;

 foreach t in array array['invoices','finance_journals','finance_credit_notes','finance_purchase_invoices'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   foreach pol in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on public.%I','AgriCore finance branch '||pol||' '||t,t);
    if pol='select' then execute format('create policy %I on public.%I as restrictive for select to authenticated using (public.agricore_branch_scope_allows(company_id,branch_id,''finance''))','AgriCore finance branch '||pol||' '||t,t);
    elsif pol='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.agricore_branch_scope_allows(company_id,branch_id,''finance''))','AgriCore finance branch '||pol||' '||t,t);
    elsif pol='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using (public.agricore_branch_scope_allows(company_id,branch_id,''finance'')) with check (public.agricore_branch_scope_allows(company_id,branch_id,''finance''))','AgriCore finance branch '||pol||' '||t,t);
    else execute format('create policy %I on public.%I as restrictive for delete to authenticated using (public.agricore_branch_scope_allows(company_id,branch_id,''finance''))','AgriCore finance branch '||pol||' '||t,t); end if;
   end loop;
  end if;
 end loop;
end $$;


-- Assignment/calendar rows follow the same depot boundaries while retaining self access.
do $$
declare t text; pol text; expr text;
begin
 foreach t in array array['job_assignments','staff_calendar_events'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   if t='job_assignments' then expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'') or user_id=auth.uid()';
   else expr='public.agricore_branch_scope_allows(company_id,branch_id,''operations'') or user_id=auth.uid()'; end if;
   foreach pol in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on public.%I','AgriCore branch '||pol||' '||t,t);
    if pol='select' then execute format('create policy %I on public.%I as restrictive for select to authenticated using (%s)','AgriCore branch '||pol||' '||t,t,expr);
    elsif pol='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (%s)','AgriCore branch '||pol||' '||t,t,expr);
    elsif pol='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using (%s) with check (%s)','AgriCore branch '||pol||' '||t,t,expr,expr);
    else execute format('create policy %I on public.%I as restrictive for delete to authenticated using (%s)','AgriCore branch '||pol||' '||t,t,expr); end if;
   end loop;
  end if;
 end loop;
end $$;

commit;
