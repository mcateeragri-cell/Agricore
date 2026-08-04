begin;

create extension if not exists pgcrypto;

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_number text,
  description text not null,
  category text,
  manufacturer text,
  supplier text,
  unit text not null default 'each',
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  quantity_in_stock numeric(14,3) not null default 0 check (quantity_in_stock >= 0),
  quantity_reserved numeric(14,3) not null default 0 check (quantity_reserved >= 0),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  location text,
  barcode text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_items_reserved_not_above_stock
    check (quantity_reserved <= quantity_in_stock)
);

-- Upgrade an earlier stock_items table without deleting data.
alter table public.stock_items
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists part_number text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists manufacturer text,
  add column if not exists supplier text,
  add column if not exists unit text default 'each',
  add column if not exists unit_cost numeric(12,2) default 0,
  add column if not exists unit_price numeric(12,2) default 0,
  add column if not exists vat_rate numeric(5,2) default 20,
  add column if not exists quantity_in_stock numeric(14,3) default 0,
  add column if not exists quantity_reserved numeric(14,3) default 0,
  add column if not exists minimum_stock numeric(14,3) default 0,
  add column if not exists reorder_level numeric(14,3) default 0,
  add column if not exists location text,
  add column if not exists barcode text,
  add column if not exists notes text,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Preserve data from legacy column names if they exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_items'
      and column_name = 'minimum_stock_level'
  ) then
    execute 'update public.stock_items set minimum_stock = coalesce(minimum_stock, minimum_stock_level, 0)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_items'
      and column_name = 'storage_location'
  ) then
    execute 'update public.stock_items set location = coalesce(location, storage_location)';
  end if;
end $$;

update public.stock_items
set
  unit = coalesce(nullif(trim(unit), ''), 'each'),
  unit_cost = greatest(coalesce(unit_cost, 0), 0),
  unit_price = greatest(coalesce(unit_price, 0), 0),
  vat_rate = least(100, greatest(coalesce(vat_rate, 20), 0)),
  quantity_in_stock = greatest(coalesce(quantity_in_stock, 0), 0),
  quantity_reserved = least(
    greatest(coalesce(quantity_reserved, 0), 0),
    greatest(coalesce(quantity_in_stock, 0), 0)
  ),
  minimum_stock = greatest(coalesce(minimum_stock, 0), 0),
  reorder_level = greatest(coalesce(reorder_level, minimum_stock, 0), 0),
  active = coalesce(active, true),
  updated_at = coalesce(updated_at, now());

create unique index if not exists stock_items_company_part_number_unique
  on public.stock_items (company_id, lower(part_number))
  where part_number is not null and trim(part_number) <> '' and active = true;

create index if not exists stock_items_company_active_idx
  on public.stock_items (company_id, active);
create index if not exists stock_items_company_description_idx
  on public.stock_items (company_id, description);
create index if not exists stock_items_company_barcode_idx
  on public.stock_items (company_id, barcode)
  where barcode is not null;

alter table public.stock_items enable row level security;

drop policy if exists "Company members can read stock" on public.stock_items;
create policy "Company members can read stock"
on public.stock_items
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = stock_items.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company staff can create stock" on public.stock_items;
create policy "Company staff can create stock"
on public.stock_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = stock_items.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Company staff can update stock" on public.stock_items;
create policy "Company staff can update stock"
on public.stock_items
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = stock_items.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = stock_items.company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

commit;
