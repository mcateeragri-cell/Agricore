begin;
alter table public.sales_stock_machines
 add column if not exists sold_customer_id uuid references public.customers(id) on delete set null,
 add column if not exists sold_invoice_id uuid references public.invoices(id) on delete set null,
 add column if not exists sold_machine_id uuid references public.machines(id) on delete set null,
 add column if not exists sold_at timestamptz,
 add column if not exists sale_price numeric(12,2);
create unique index if not exists sales_stock_machine_invoice_unique on public.sales_stock_machines(sold_invoice_id) where sold_invoice_id is not null;
create table if not exists public.sales_machine_sales (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 stock_machine_id uuid not null references public.sales_stock_machines(id) on delete restrict,
 customer_id uuid not null references public.customers(id) on delete restrict,
 customer_machine_id uuid not null references public.machines(id) on delete restrict,
 invoice_id uuid not null references public.invoices(id) on delete restrict,
 sale_date date not null, sale_price numeric(12,2) not null default 0, vat_rate numeric(8,4) not null default 20,
 vat_amount numeric(12,2) not null default 0, total numeric(12,2) not null default 0,
 warranty text, salesperson text, notes text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), unique(company_id,stock_machine_id), unique(company_id,invoice_id)
);
create index if not exists sales_machine_sales_company_date_idx on public.sales_machine_sales(company_id,sale_date desc);
alter table public.sales_machine_sales enable row level security;
revoke all on public.sales_machine_sales from anon;
commit;
