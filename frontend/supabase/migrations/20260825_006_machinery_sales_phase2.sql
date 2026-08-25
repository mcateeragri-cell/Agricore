begin;

alter table public.sales_stock_machines
  add column if not exists preparation_cost numeric(12,2) not null default 0,
  add column if not exists other_costs numeric(12,2) not null default 0,
  add column if not exists warranty_expiry date,
  add column if not exists first_service_due_date date,
  add column if not exists first_service_due_hours numeric(12,1),
  add column if not exists salesperson_id uuid,
  add column if not exists source_trade_in_id uuid references public.sales_trade_ins(id) on delete set null;

alter table public.sales_machine_sales
  add column if not exists gross_margin numeric(12,2),
  add column if not exists stock_cost numeric(12,2),
  add column if not exists preparation_cost numeric(12,2),
  add column if not exists other_costs numeric(12,2),
  add column if not exists warranty_expiry date,
  add column if not exists first_service_due_date date,
  add column if not exists first_service_due_hours numeric(12,1),
  add column if not exists salesperson_id uuid;

alter table public.sales_trade_ins
  add column if not exists stock_machine_id uuid references public.sales_stock_machines(id) on delete set null,
  add column if not exists received_at timestamptz;

create index if not exists sales_stock_source_trade_idx on public.sales_stock_machines(company_id,source_trade_in_id);
create index if not exists sales_machine_sales_salesperson_idx on public.sales_machine_sales(company_id,salesperson_id,sale_date desc);

commit;
