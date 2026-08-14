-- AgriCore Enterprise Multi-Branch Pack E
-- Company-wide parts catalogue + per-depot balances and audited stock transfers.

begin;

create table if not exists public.stock_branch_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.company_branches(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  quantity_in_stock numeric(14,3) not null default 0 check (quantity_in_stock >= 0),
  quantity_reserved numeric(14,3) not null default 0 check (quantity_reserved >= 0 and quantity_reserved <= quantity_in_stock),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, branch_id, stock_item_id)
);
create index if not exists stock_branch_balances_company_branch_idx on public.stock_branch_balances(company_id,branch_id);
create index if not exists stock_branch_balances_item_idx on public.stock_branch_balances(stock_item_id,branch_id);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  from_branch_id uuid not null references public.company_branches(id) on delete restrict,
  to_branch_id uuid not null references public.company_branches(id) on delete restrict,
  quantity numeric(14,3) not null check(quantity > 0),
  reference text,
  notes text,
  status text not null default 'completed' check(status in ('completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_transfer_different_branches check(from_branch_id <> to_branch_id)
);
create index if not exists stock_transfers_company_created_idx on public.stock_transfers(company_id,created_at desc);

alter table public.stock_movements add column if not exists stock_transfer_id uuid references public.stock_transfers(id) on delete set null;
create index if not exists stock_movements_transfer_idx on public.stock_movements(stock_transfer_id) where stock_transfer_id is not null;

-- Existing company stock becomes the opening balance of the record's current/main depot.
insert into public.stock_branch_balances(company_id,branch_id,stock_item_id,quantity_in_stock,quantity_reserved,minimum_stock,reorder_level,location,created_at,updated_at)
select s.company_id,s.branch_id,s.id,greatest(coalesce(s.quantity_in_stock,0),0),least(greatest(coalesce(s.quantity_reserved,0),0),greatest(coalesce(s.quantity_in_stock,0),0)),greatest(coalesce(s.minimum_stock,0),0),greatest(coalesce(s.reorder_level,s.minimum_stock,0),0),s.location,now(),now()
from public.stock_items s
where s.branch_id is not null
on conflict(company_id,branch_id,stock_item_id) do nothing;

-- stock_items is now the company-wide catalogue. Remove the restrictive depot policies
-- added by Pack B+C; per-depot visibility is enforced on stock_branch_balances/movements.
do $$ declare p text; begin
  foreach p in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on public.stock_items','AgriCore branch '||p||' stock_items');
  end loop;
end $$;

alter table public.stock_branch_balances enable row level security;
drop policy if exists "Branch scoped members read stock balances" on public.stock_branch_balances;
create policy "Branch scoped members read stock balances" on public.stock_branch_balances for select to authenticated
using(public.agricore_branch_scope_allows(company_id,branch_id,'operations'));
drop policy if exists "Branch scoped members create stock balances" on public.stock_branch_balances;
create policy "Branch scoped members create stock balances" on public.stock_branch_balances for insert to authenticated
with check(public.agricore_branch_scope_allows(company_id,branch_id,'operations'));
drop policy if exists "Branch scoped members update stock balances" on public.stock_branch_balances;
create policy "Branch scoped members update stock balances" on public.stock_branch_balances for update to authenticated
using(public.agricore_branch_scope_allows(company_id,branch_id,'operations'))
with check(public.agricore_branch_scope_allows(company_id,branch_id,'operations'));

alter table public.stock_transfers enable row level security;
drop policy if exists "Branch scoped members read stock transfers" on public.stock_transfers;
create policy "Branch scoped members read stock transfers" on public.stock_transfers for select to authenticated
using(public.agricore_branch_scope_allows(company_id,from_branch_id,'operations') or public.agricore_branch_scope_allows(company_id,to_branch_id,'operations'));

-- Keep the legacy company totals correct for quotes/search/network pages.
create or replace function public.agricore_refresh_stock_company_total(p_item uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  update public.stock_items s
  set quantity_in_stock=coalesce((select sum(b.quantity_in_stock) from public.stock_branch_balances b where b.stock_item_id=s.id),0),
      quantity_reserved=coalesce((select sum(b.quantity_reserved) from public.stock_branch_balances b where b.stock_item_id=s.id),0),
      updated_at=now()
  where s.id=p_item;
end $$;

create or replace function public.agricore_balance_refresh_total() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.agricore_refresh_stock_company_total(coalesce(new.stock_item_id,old.stock_item_id));
  return coalesce(new,old);
end $$;
drop trigger if exists agricore_balance_refresh_total_trigger on public.stock_branch_balances;
create trigger agricore_balance_refresh_total_trigger after insert or update or delete on public.stock_branch_balances
for each row execute function public.agricore_balance_refresh_total();

-- Seed a depot balance whenever a new catalogue item is created through legacy/new UI.
create or replace function public.agricore_seed_stock_balance() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.branch_id is not null then
    insert into public.stock_branch_balances(company_id,branch_id,stock_item_id,quantity_in_stock,quantity_reserved,minimum_stock,reorder_level,location)
    values(new.company_id,new.branch_id,new.id,greatest(coalesce(new.quantity_in_stock,0),0),least(greatest(coalesce(new.quantity_reserved,0),0),greatest(coalesce(new.quantity_in_stock,0),0)),greatest(coalesce(new.minimum_stock,0),0),greatest(coalesce(new.reorder_level,new.minimum_stock,0),0),new.location)
    on conflict(company_id,branch_id,stock_item_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists agricore_seed_stock_balance_trigger on public.stock_items;
create trigger agricore_seed_stock_balance_trigger after insert on public.stock_items for each row execute function public.agricore_seed_stock_balance();

-- New movements are the single source of truth for depot quantity changes.
create or replace function public.agricore_stock_movement_branch() returns trigger
language plpgsql security definer set search_path=public as $$
declare resolved uuid; current_qty numeric;
begin
  if new.branch_id is null and new.job_id is not null then select branch_id into resolved from public.jobs where id=new.job_id and company_id=new.company_id; end if;
  if new.branch_id is null and resolved is null and new.purchase_order_id is not null then select branch_id into resolved from public.purchase_orders where id=new.purchase_order_id and company_id=new.company_id; end if;
  if new.branch_id is null and resolved is null then select branch_id into resolved from public.stock_items where id=new.stock_item_id and company_id=new.company_id; end if;
  new.branch_id:=coalesce(new.branch_id,resolved);
  if new.branch_id is null then raise exception 'Stock depot could not be resolved.'; end if;
  if not exists(select 1 from public.company_branches b where b.id=new.branch_id and b.company_id=new.company_id and b.active) then raise exception 'Stock depot is invalid or inactive.'; end if;
  return new;
end $$;
drop trigger if exists agricore_stock_movement_branch_trigger on public.stock_movements;
create trigger agricore_stock_movement_branch_trigger before insert on public.stock_movements for each row execute function public.agricore_stock_movement_branch();

create or replace function public.agricore_apply_stock_movement() returns trigger
language plpgsql security definer set search_path=public as $$
declare current_qty numeric; next_qty numeric;
begin
  insert into public.stock_branch_balances(company_id,branch_id,stock_item_id,quantity_in_stock,quantity_reserved,minimum_stock,reorder_level,location)
  select new.company_id,new.branch_id,new.stock_item_id,0,0,coalesce(s.minimum_stock,0),coalesce(s.reorder_level,s.minimum_stock,0),s.location from public.stock_items s where s.id=new.stock_item_id
  on conflict(company_id,branch_id,stock_item_id) do nothing;
  select quantity_in_stock into current_qty from public.stock_branch_balances where company_id=new.company_id and branch_id=new.branch_id and stock_item_id=new.stock_item_id for update;
  next_qty:=coalesce(current_qty,0)+new.quantity;
  if next_qty < 0 then raise exception 'Insufficient depot stock. Available %, requested %.',coalesce(current_qty,0),abs(new.quantity); end if;
  update public.stock_branch_balances set quantity_in_stock=next_qty,updated_at=now() where company_id=new.company_id and branch_id=new.branch_id and stock_item_id=new.stock_item_id;
  return new;
end $$;
drop trigger if exists agricore_apply_stock_movement_trigger on public.stock_movements;
create trigger agricore_apply_stock_movement_trigger after insert on public.stock_movements for each row execute function public.agricore_apply_stock_movement();

-- Legacy code still writes stock_items.quantity_in_stock before creating a movement.
-- Ignore those direct quantity writes; the movement trigger above owns depot stock.
create or replace function public.agricore_guard_stock_catalog_totals() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.quantity_in_stock is distinct from old.quantity_in_stock or new.quantity_reserved is distinct from old.quantity_reserved then
    new.quantity_in_stock:=old.quantity_in_stock;
    new.quantity_reserved:=old.quantity_reserved;
  end if;
  return new;
end $$;
drop trigger if exists agricore_guard_stock_catalog_totals_trigger on public.stock_items;
create trigger agricore_guard_stock_catalog_totals_trigger before update of quantity_in_stock,quantity_reserved on public.stock_items for each row execute function public.agricore_guard_stock_catalog_totals();

-- Atomic depot-to-depot transfer. Server route calls this with service-role after permission validation.
create or replace function public.agricore_transfer_depot_stock(p_company uuid,p_item uuid,p_from uuid,p_to uuid,p_quantity numeric,p_reference text,p_notes text,p_user uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare transfer_id uuid; available numeric;
begin
  if p_quantity is null or p_quantity<=0 then raise exception 'Transfer quantity must be greater than zero.'; end if;
  if p_from=p_to then raise exception 'Choose two different depots.'; end if;
  if not exists(select 1 from public.stock_items where id=p_item and company_id=p_company and active) then raise exception 'Stock item not found.'; end if;
  if not exists(select 1 from public.company_branches where id=p_from and company_id=p_company and active) or not exists(select 1 from public.company_branches where id=p_to and company_id=p_company and active) then raise exception 'Depot is invalid or inactive.'; end if;
  select quantity_in_stock into available from public.stock_branch_balances where company_id=p_company and branch_id=p_from and stock_item_id=p_item for update;
  if coalesce(available,0)<p_quantity then raise exception 'Only % available in the source depot.',coalesce(available,0); end if;
  insert into public.stock_transfers(company_id,stock_item_id,from_branch_id,to_branch_id,quantity,reference,notes,created_by) values(p_company,p_item,p_from,p_to,p_quantity,nullif(trim(p_reference),''),nullif(trim(p_notes),''),p_user) returning id into transfer_id;
  insert into public.stock_movements(company_id,branch_id,stock_item_id,stock_transfer_id,movement_type,quantity,reference,notes,created_by) values
   (p_company,p_from,p_item,transfer_id,'transfer_out',-p_quantity,p_reference,p_notes,p_user),
   (p_company,p_to,p_item,transfer_id,'transfer_in',p_quantity,p_reference,p_notes,p_user);
  return transfer_id;
end $$;
revoke all on function public.agricore_transfer_depot_stock(uuid,uuid,uuid,uuid,numeric,text,text,uuid) from public,authenticated;
grant execute on function public.agricore_transfer_depot_stock(uuid,uuid,uuid,uuid,numeric,text,text,uuid) to service_role;

-- Recalculate totals once after backfill.
do $$ declare r record; begin for r in select id from public.stock_items loop perform public.agricore_refresh_stock_company_total(r.id); end loop; end $$;

commit;
