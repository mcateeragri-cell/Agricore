begin;
create table if not exists public.parts_quote_reservations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 branch_id uuid not null references public.company_branches(id) on delete restrict, quote_id uuid not null references public.quotes(id) on delete cascade,
 quote_item_id uuid references public.quote_items(id) on delete cascade, stock_item_id uuid not null references public.stock_items(id) on delete restrict,
 quantity numeric(14,3) not null check(quantity>0), status text not null default 'reserved' check(status in('reserved','released','issued')),
 created_by uuid, created_at timestamptz not null default now(), released_at timestamptz, issued_at timestamptz);
create unique index if not exists parts_quote_reservation_line_uidx on public.parts_quote_reservations(quote_item_id) where quote_item_id is not null and status='reserved';
create index if not exists parts_quote_reservations_lookup_idx on public.parts_quote_reservations(company_id,branch_id,stock_item_id,status);
alter table public.parts_quote_reservations enable row level security;
drop policy if exists "parts_quote_reservations_company_read" on public.parts_quote_reservations;
create policy "parts_quote_reservations_company_read" on public.parts_quote_reservations for select to authenticated using(
 exists(select 1 from public.company_members cm where cm.company_id=parts_quote_reservations.company_id and cm.user_id=auth.uid() and cm.is_active=true));

create or replace function public.agricore_refresh_branch_reserved(p_company uuid,p_branch uuid,p_stock_item uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_reserved numeric(14,3);
begin
 select coalesce(sum(quantity),0) into v_reserved from parts_quote_reservations
 where company_id=p_company and branch_id=p_branch and stock_item_id=p_stock_item and status='reserved';
 update stock_branch_balances set quantity_reserved=v_reserved,updated_at=now()
 where company_id=p_company and branch_id=p_branch and stock_item_id=p_stock_item;
end $$;

create or replace function public.agricore_reserve_parts_quote(p_company uuid,p_branch uuid,p_quote uuid,p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_line record;v_available numeric(14,3);v_count integer:=0;
begin
 if not exists(select 1 from quotes where id=p_quote and company_id=p_company and commercial_type='parts') then raise exception 'Parts quote not found.';end if;
 for v_line in select qi.id quote_item_id,qi.source_id stock_item_id,qi.quantity from quote_items qi
  where qi.company_id=p_company and qi.quote_id=p_quote and qi.item_type='part' and qi.source_id is not null and qi.quantity>0
 loop
  select greatest(0,quantity_in_stock-quantity_reserved) into v_available from stock_branch_balances
   where company_id=p_company and branch_id=p_branch and stock_item_id=v_line.stock_item_id for update;
  if coalesce(v_available,0)<v_line.quantity then raise exception 'Insufficient available stock for one or more quote lines.';end if;
  insert into parts_quote_reservations(company_id,branch_id,quote_id,quote_item_id,stock_item_id,quantity,status,created_by)
   values(p_company,p_branch,p_quote,v_line.quote_item_id,v_line.stock_item_id,v_line.quantity,'reserved',p_user)
   on conflict(quote_item_id) where quote_item_id is not null and status='reserved'
   do update set quantity=excluded.quantity,branch_id=excluded.branch_id;
  perform agricore_refresh_branch_reserved(p_company,p_branch,v_line.stock_item_id);v_count:=v_count+1;
 end loop;
 return jsonb_build_object('reserved',true,'lines',v_count);
end $$;

create or replace function public.agricore_release_parts_quote(p_company uuid,p_quote uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v record;
begin
 for v in select distinct branch_id,stock_item_id from parts_quote_reservations where company_id=p_company and quote_id=p_quote and status='reserved'
 loop
  update parts_quote_reservations set status='released',released_at=now()
   where company_id=p_company and quote_id=p_quote and branch_id=v.branch_id and stock_item_id=v.stock_item_id and status='reserved';
  perform agricore_refresh_branch_reserved(p_company,v.branch_id,v.stock_item_id);
 end loop;
 return jsonb_build_object('released',true);
end $$;

create or replace function public.agricore_invoice_reserved_parts_quote(p_company uuid,p_quote uuid,p_user uuid,p_invoice_number text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare q record;r record;qi record;v_invoice uuid;v_sub numeric(14,2):=0;v_vat numeric(14,2):=0;v_net numeric(14,2);v_sort integer:=0;
begin
 select * into q from quotes where id=p_quote and company_id=p_company and commercial_type='parts' for update;
 if not found then raise exception 'Parts quote not found.';end if;
 if not exists(select 1 from parts_quote_reservations where company_id=p_company and quote_id=p_quote and status='reserved') then raise exception 'This Parts quote has no active stock reservation.';end if;
 for qi in select qi.*,coalesce(si.vat_rate,20) stock_vat from quote_items qi left join stock_items si on si.id=qi.source_id and si.company_id=p_company where qi.company_id=p_company and qi.quote_id=p_quote
 loop v_net:=round(coalesce(qi.line_total,coalesce(qi.quantity,0)*coalesce(qi.unit_price,0)),2);v_sub:=v_sub+v_net;v_vat:=v_vat+round(v_net*(coalesce(qi.stock_vat,20)/100),2);end loop;
 insert into invoices(company_id,commercial_type,invoice_number,customer_id,status,issue_date,due_date,subtotal,vat_rate,vat_amount,total,amount_paid,customer_name,customer_email,customer_phone,billing_address,notes,payment_terms,created_by)
 values(p_company,'parts',p_invoice_number,q.customer_id,'draft',current_date,current_date+7,v_sub,0,v_vat,v_sub+v_vat,0,q.customer_name,q.customer_email,q.customer_phone,q.billing_address,q.notes,'Payment due within 7 days',p_user) returning id into v_invoice;
 for qi in select * from quote_items where company_id=p_company and quote_id=p_quote order by sort_order,id loop
  insert into invoice_items(company_id,invoice_id,item_type,source_id,description,quantity,unit_price,line_total,sort_order)
  values(p_company,v_invoice,coalesce(qi.item_type,'part'),qi.source_id,qi.description,qi.quantity,qi.unit_price,qi.line_total,v_sort);v_sort:=v_sort+1;end loop;
 for r in select * from parts_quote_reservations where company_id=p_company and quote_id=p_quote and status='reserved' for update loop
  insert into stock_movements(company_id,branch_id,stock_item_id,movement_type,quantity,reference,notes,created_by)
   values(p_company,r.branch_id,r.stock_item_id,'counter_sale',-r.quantity,p_invoice_number,'Issued from accepted Parts quote',p_user);
  update parts_quote_reservations set status='issued',issued_at=now() where id=r.id;
  perform agricore_refresh_branch_reserved(p_company,r.branch_id,r.stock_item_id);end loop;
 update quotes set status='accepted',updated_at=now() where id=p_quote and company_id=p_company;
 return jsonb_build_object('invoice_id',v_invoice,'invoice_number',p_invoice_number,'total',v_sub+v_vat);
end $$;
revoke all on function public.agricore_reserve_parts_quote(uuid,uuid,uuid,uuid) from public,authenticated;
revoke all on function public.agricore_release_parts_quote(uuid,uuid) from public,authenticated;
revoke all on function public.agricore_invoice_reserved_parts_quote(uuid,uuid,uuid,text) from public,authenticated;
grant execute on function public.agricore_reserve_parts_quote(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.agricore_release_parts_quote(uuid,uuid) to service_role;
grant execute on function public.agricore_invoice_reserved_parts_quote(uuid,uuid,uuid,text) to service_role;
commit;