begin;

-- Department-aware commercial documents.
alter table public.quotes
  add column if not exists commercial_type text not null default 'service'
  check (commercial_type in ('service','machinery_sale','parts','general'));

alter table public.invoices
  add column if not exists commercial_type text not null default 'service'
  check (commercial_type in ('service','machinery_sale','parts','general'));

update public.invoices i
set commercial_type = 'machinery_sale'
where exists (
  select 1 from public.sales_machine_sales s
  where s.company_id = i.company_id and s.invoice_id = i.id
);

update public.invoices
set commercial_type = 'general'
where job_id is null
  and commercial_type = 'service'
  and not exists (
    select 1 from public.sales_machine_sales s
    where s.company_id = invoices.company_id and s.invoice_id = invoices.id
  );

-- New company roles and departmental permissions.
insert into public.app_permissions(permission_key,name,description,module) values
 ('quotes.view','View quotes','View quotes within the user''s permitted commercial department.','quotes'),
 ('quotes.manage','Manage quotes','Create and manage quotes within the user''s permitted commercial department.','quotes'),
 ('stock.view','View stock','View parts stock and purchasing information.','stock'),
 ('stock.manage','Manage stock','Manage stock, suppliers, purchase orders and stock control.','stock'),
 ('parts.sales','Parts sales','Create parts-only quotes and invoices.','stock'),
 ('commercial.view_all','View all commercial departments','View service, machinery-sales and parts quotes/invoices together.','commercial')
on conflict (permission_key) do nothing;

-- Seed sensible defaults for every existing company. Company admins remain governed by the app's protected full-access behaviour.
insert into public.company_role_permissions(company_id,role,permission_key,allowed)
select c.id, seed.role, seed.permission_key, true
from public.companies c
cross join (values
 ('sales_manager','sales.view'),('sales_manager','sales.manage'),('sales_manager','quotes.view'),('sales_manager','quotes.manage'),('sales_manager','invoices.view'),('sales_manager','invoices.manage'),
 ('salesperson','sales.view'),('salesperson','quotes.view'),('salesperson','quotes.manage'),('salesperson','invoices.view'),
 ('parts_manager','stock.view'),('parts_manager','stock.manage'),('parts_manager','parts.sales'),('parts_manager','quotes.view'),('parts_manager','quotes.manage'),('parts_manager','invoices.view'),('parts_manager','invoices.manage'),
 ('parts_advisor','stock.view'),('parts_advisor','parts.sales'),('parts_advisor','quotes.view'),('parts_advisor','quotes.manage'),('parts_advisor','invoices.view'),('parts_advisor','invoices.manage'),
 ('office','commercial.view_all')
) as seed(role,permission_key)
on conflict (company_id,role,permission_key) do update set allowed=excluded.allowed;

create index if not exists quotes_company_commercial_idx on public.quotes(company_id,commercial_type,created_at desc);
create index if not exists invoices_company_commercial_idx on public.invoices(company_id,commercial_type,created_at desc);


-- Department isolation is enforced at database level, not just hidden in navigation.
-- Restrictive policies combine with existing company policies and prevent a department
-- from reading another department's commercial documents by manually changing a URL.

drop policy if exists "department_scope_quotes_select" on public.quotes;
create policy "department_scope_quotes_select"
on public.quotes as restrictive for select to authenticated
using (
  exists (
    select 1
    from public.company_member_roles r
    where r.company_id = quotes.company_id
      and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office','read_only')
        or (r.role = 'service_manager' and quotes.commercial_type = 'service')
        or (r.role = 'sales_manager' and quotes.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and quotes.commercial_type = 'machinery_sale' and quotes.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and quotes.commercial_type = 'parts')
      )
  )
  or exists (
    select 1 from public.platform_user_roles p
    where p.user_id = auth.uid() and p.role in ('super_admin','platform_admin')
  )
);

drop policy if exists "department_scope_quotes_write" on public.quotes;
create policy "department_scope_quotes_write"
on public.quotes as restrictive for all to authenticated
using (
  exists (
    select 1 from public.company_member_roles r
    where r.company_id = quotes.company_id and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role = 'service_manager' and quotes.commercial_type = 'service')
        or (r.role = 'sales_manager' and quotes.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and quotes.commercial_type = 'machinery_sale' and quotes.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and quotes.commercial_type = 'parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
)
with check (
  exists (
    select 1 from public.company_member_roles r
    where r.company_id = quotes.company_id and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role = 'service_manager' and quotes.commercial_type = 'service')
        or (r.role = 'sales_manager' and quotes.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and quotes.commercial_type = 'machinery_sale' and quotes.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and quotes.commercial_type = 'parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
);

drop policy if exists "department_scope_invoices_select" on public.invoices;
create policy "department_scope_invoices_select"
on public.invoices as restrictive for select to authenticated
using (
  exists (
    select 1 from public.company_member_roles r
    where r.company_id = invoices.company_id
      and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office','read_only')
        or (r.role = 'service_manager' and invoices.commercial_type = 'service')
        or (r.role = 'sales_manager' and invoices.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and invoices.commercial_type = 'machinery_sale' and invoices.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and invoices.commercial_type = 'parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
);

drop policy if exists "department_scope_invoices_write" on public.invoices;
create policy "department_scope_invoices_write"
on public.invoices as restrictive for all to authenticated
using (
  exists (
    select 1 from public.company_member_roles r
    where r.company_id = invoices.company_id and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role = 'service_manager' and invoices.commercial_type = 'service')
        or (r.role = 'sales_manager' and invoices.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and invoices.commercial_type = 'machinery_sale' and invoices.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and invoices.commercial_type = 'parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
)
with check (
  exists (
    select 1 from public.company_member_roles r
    where r.company_id = invoices.company_id and r.user_id = auth.uid()
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role = 'service_manager' and invoices.commercial_type = 'service')
        or (r.role = 'sales_manager' and invoices.commercial_type = 'machinery_sale')
        or (r.role = 'salesperson' and invoices.commercial_type = 'machinery_sale' and invoices.created_by = auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and invoices.commercial_type = 'parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
);

-- Child line items inherit the parent document's department.
drop policy if exists "department_scope_quote_items" on public.quote_items;
create policy "department_scope_quote_items"
on public.quote_items as restrictive for all to authenticated
using (
  exists (
    select 1 from public.quotes q
    join public.company_member_roles r on r.company_id=q.company_id and r.user_id=auth.uid()
    where q.id=quote_items.quote_id and q.company_id=quote_items.company_id
      and (
        r.role in ('company_admin','administrator','office','read_only')
        or (r.role='service_manager' and q.commercial_type='service')
        or (r.role='sales_manager' and q.commercial_type='machinery_sale')
        or (r.role='salesperson' and q.commercial_type='machinery_sale' and q.created_by=auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and q.commercial_type='parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
)
with check (
  exists (
    select 1 from public.quotes q
    join public.company_member_roles r on r.company_id=q.company_id and r.user_id=auth.uid()
    where q.id=quote_items.quote_id and q.company_id=quote_items.company_id
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role='service_manager' and q.commercial_type='service')
        or (r.role='sales_manager' and q.commercial_type='machinery_sale')
        or (r.role='salesperson' and q.commercial_type='machinery_sale' and q.created_by=auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and q.commercial_type='parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
);

drop policy if exists "department_scope_invoice_items" on public.invoice_items;
create policy "department_scope_invoice_items"
on public.invoice_items as restrictive for all to authenticated
using (
  exists (
    select 1 from public.invoices i
    join public.company_member_roles r on r.company_id=i.company_id and r.user_id=auth.uid()
    where i.id=invoice_items.invoice_id and i.company_id=invoice_items.company_id
      and (
        r.role in ('company_admin','administrator','office','read_only')
        or (r.role='service_manager' and i.commercial_type='service')
        or (r.role='sales_manager' and i.commercial_type='machinery_sale')
        or (r.role='salesperson' and i.commercial_type='machinery_sale' and i.created_by=auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and i.commercial_type='parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
)
with check (
  exists (
    select 1 from public.invoices i
    join public.company_member_roles r on r.company_id=i.company_id and r.user_id=auth.uid()
    where i.id=invoice_items.invoice_id and i.company_id=invoice_items.company_id
      and (
        r.role in ('company_admin','administrator','office')
        or (r.role='service_manager' and i.commercial_type='service')
        or (r.role='sales_manager' and i.commercial_type='machinery_sale')
        or (r.role='salesperson' and i.commercial_type='machinery_sale' and i.created_by=auth.uid())
        or (r.role in ('parts_manager','parts_advisor') and i.commercial_type='parts')
      )
  )
  or exists (select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in ('super_admin','platform_admin'))
);

commit;
