begin;

-- Dealership-style baseline permissions.
-- These are defaults; Company Admin can still customise role permissions later.

insert into public.company_role_permissions(company_id,role,permission_key,allowed)
select c.id, x.role, x.permission_key, x.allowed
from public.companies c
cross join (values
  -- Service management: operational workshop + stock visibility, not Parts commercial control.
  ('service_manager','jobs.view_all',true),
  ('service_manager','jobs.assign',true),
  ('service_manager','jobs.edit',true),
  ('service_manager','jobs.review',true),
  ('service_manager','calendar.manage',true),
  ('service_manager','customers.edit',true),
  ('service_manager','machines.edit',true),
  ('service_manager','service_programmes.view',true),
  ('service_manager','service_programmes.manage',true),
  ('service_manager','quotes.view',true),
  ('service_manager','quotes.manage',true),
  ('service_manager','invoices.view',true),
  ('service_manager','invoices.manage',true),
  ('service_manager','stock.view',true),
  ('service_manager','stock.manage',false),
  ('service_manager','parts.sales',false),
  ('service_manager','sales.view',false),
  ('service_manager','sales.manage',false),
  ('service_manager','commercial.view_all',false),

  -- Sales management.
  ('sales_manager','sales.view',true),
  ('sales_manager','sales.manage',true),
  ('sales_manager','quotes.view',true),
  ('sales_manager','quotes.manage',true),
  ('sales_manager','invoices.view',true),
  ('sales_manager','invoices.manage',true),
  ('sales_manager','stock.view',true),
  ('sales_manager','stock.manage',false),
  ('sales_manager','parts.sales',false),
  ('sales_manager','commercial.view_all',false),

  -- Salesperson.
  ('salesperson','sales.view',true),
  ('salesperson','sales.manage',false),
  ('salesperson','quotes.view',true),
  ('salesperson','quotes.manage',true),
  ('salesperson','invoices.view',true),
  ('salesperson','invoices.manage',false),
  ('salesperson','stock.view',true),
  ('salesperson','stock.manage',false),
  ('salesperson','parts.sales',false),
  ('salesperson','commercial.view_all',false),

  -- Parts management.
  ('parts_manager','stock.view',true),
  ('parts_manager','stock.manage',true),
  ('parts_manager','parts.sales',true),
  ('parts_manager','quotes.view',true),
  ('parts_manager','quotes.manage',true),
  ('parts_manager','invoices.view',true),
  ('parts_manager','invoices.manage',true),
  ('parts_manager','commercial.view_all',false),

  -- Parts advisor.
  ('parts_advisor','stock.view',true),
  ('parts_advisor','stock.manage',false),
  ('parts_advisor','parts.sales',true),
  ('parts_advisor','quotes.view',true),
  ('parts_advisor','quotes.manage',true),
  ('parts_advisor','invoices.view',true),
  ('parts_advisor','invoices.manage',true),
  ('parts_advisor','commercial.view_all',false),

  -- Office is cross-department operational administration.
  ('office','commercial.view_all',true),
  ('office','stock.view',true),
  ('office','quotes.view',true),
  ('office','quotes.manage',true),
  ('office','invoices.view',true),
  ('office','invoices.manage',true),

  -- Field roles: job execution, no commercial department access.
  ('technician','commercial.view_all',false),
  ('technician','parts.sales',false),
  ('technician','stock.manage',false),
  ('apprentice','commercial.view_all',false),
  ('apprentice','parts.sales',false),
  ('apprentice','stock.manage',false)
) as x(role,permission_key,allowed)
on conflict (company_id,role,permission_key)
do update set allowed=excluded.allowed;

commit;
