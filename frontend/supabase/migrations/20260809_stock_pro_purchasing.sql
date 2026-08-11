begin;

create extension if not exists pgcrypto;

create table if not exists public.stock_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  account_reference text,
  website text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stock_suppliers_company_name_unique
  on public.stock_suppliers (company_id, lower(name))
  where active = true;

create index if not exists stock_suppliers_company_idx
  on public.stock_suppliers (company_id, active, name);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  job_part_id uuid,
  purchase_order_id uuid,
  movement_type text not null check (movement_type in (
    'opening_balance', 'receipt', 'job_usage', 'job_return',
    'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out'
  )),
  quantity numeric(14,3) not null check (quantity <> 0),
  unit_cost numeric(12,2),
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_company_created_idx
  on public.stock_movements (company_id, created_at desc);
create index if not exists stock_movements_item_created_idx
  on public.stock_movements (stock_item_id, created_at desc);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.stock_suppliers(id) on delete set null,
  supplier_name text not null,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft','ordered','part_received','received','cancelled')),
  order_date date not null default current_date,
  expected_date date,
  notes text,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchase_orders_company_order_number_unique
  on public.purchase_orders (company_id, order_number);
create index if not exists purchase_orders_company_status_idx
  on public.purchase_orders (company_id, status, order_date desc);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  stock_item_id uuid references public.stock_items(id) on delete set null,
  part_number text,
  description text not null,
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0),
  quantity_received numeric(14,3) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_order_lines_received_not_above_ordered check (quantity_received <= quantity_ordered)
);

create index if not exists purchase_order_lines_order_idx
  on public.purchase_order_lines (purchase_order_id);

alter table public.stock_movements
  drop constraint if exists stock_movements_purchase_order_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_purchase_order_id_fkey
  foreign key (purchase_order_id) references public.purchase_orders(id) on delete set null;

-- Company membership policies for all Stock Pro tables.
do $$
declare
  t text;
begin
  foreach t in array array['stock_suppliers','stock_movements','purchase_orders','purchase_order_lines']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Company members can read %s" on public.%I', t, t);
    execute format(
      'create policy "Company members can read %s" on public.%I for select to authenticated using (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true))',
      t, t, t
    );
    execute format('drop policy if exists "Company members can insert %s" on public.%I', t, t);
    execute format(
      'create policy "Company members can insert %s" on public.%I for insert to authenticated with check (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true))',
      t, t, t
    );
    execute format('drop policy if exists "Company members can update %s" on public.%I', t, t);
    execute format(
      'create policy "Company members can update %s" on public.%I for update to authenticated using (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true)) with check (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true))',
      t, t, t, t
    );
    execute format('drop policy if exists "Company members can delete %s" on public.%I', t, t);
    execute format(
      'create policy "Company members can delete %s" on public.%I for delete to authenticated using (exists (select 1 from public.company_members cm where cm.company_id = %I.company_id and cm.user_id = auth.uid() and cm.is_active = true))',
      t, t, t
    );
  end loop;
end $$;

commit;
