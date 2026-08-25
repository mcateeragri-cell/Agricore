begin;

-- Counter-sale stock movements are first-class movements.
alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check check (movement_type in (
  'opening_balance','receipt','job_usage','job_return','adjustment_in','adjustment_out',
  'transfer_in','transfer_out','counter_sale','counter_sale_return'
));

alter table public.invoices add column if not exists payment_method text;
alter table public.invoices drop constraint if exists invoices_payment_method_check;
alter table public.invoices add constraint invoices_payment_method_check
  check (payment_method is null or payment_method in ('account','cash','card','bank_transfer','other'));

create table if not exists public.parts_counter_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.company_branches(id) on delete restrict,
  invoice_id uuid not null unique references public.invoices(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  payment_method text not null default 'account' check (payment_method in ('account','cash','card','bank_transfer','other')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists parts_counter_sales_company_created_idx on public.parts_counter_sales(company_id,created_at desc);
alter table public.parts_counter_sales enable row level security;
drop policy if exists "Company members can read counter sales" on public.parts_counter_sales;
create policy "Company members can read counter sales" on public.parts_counter_sales for select to authenticated
using (exists(select 1 from public.company_members cm where cm.company_id=parts_counter_sales.company_id and cm.user_id=auth.uid() and cm.is_active=true));

create or replace function public.agricore_create_parts_counter_sale(
  p_company uuid,
  p_branch uuid,
  p_user uuid,
  p_customer uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_billing_address text,
  p_invoice_number text,
  p_payment_method text,
  p_mark_paid boolean,
  p_notes text,
  p_lines jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_invoice uuid;
  v_sale uuid;
  v_line jsonb;
  v_item record;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_discount numeric(7,3);
  v_net numeric(14,2);
  v_vat numeric(14,2);
  v_subtotal numeric(14,2):=0;
  v_vat_total numeric(14,2):=0;
  v_total numeric(14,2):=0;
  v_available numeric(14,3);
  v_sort integer:=0;
  v_payment text:=case when p_payment_method in ('account','cash','card','bank_transfer','other') then p_payment_method else 'account' end;
begin
  if not exists(select 1 from company_branches where id=p_branch and company_id=p_company and active) then
    raise exception 'Selected depot is not available.';
  end if;
  if p_customer is not null and not exists(select 1 from customers where id=p_customer and company_id=p_company) then
    raise exception 'Customer does not belong to the active company.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then
    raise exception 'Add at least one part.';
  end if;

  -- Lock every requested depot balance before calculating the invoice.
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_qty:=round(greatest(0,coalesce((v_line->>'quantity')::numeric,0)),3);
    v_price:=round(greatest(0,coalesce((v_line->>'unit_price')::numeric,0)),2);
    v_discount:=least(100,greatest(0,coalesce((v_line->>'discount_percent')::numeric,0)));

    select s.id,s.part_number,s.description,s.vat_rate,s.unit_cost
      into v_item
    from stock_items s
    where s.id=(v_line->>'stock_item_id')::uuid and s.company_id=p_company and s.active
    for share;
    if not found then raise exception 'A selected stock item is no longer available.'; end if;

    select greatest(0,quantity_in_stock-quantity_reserved)
      into v_available
    from stock_branch_balances
    where company_id=p_company and branch_id=p_branch and stock_item_id=v_item.id
    for update;
    if coalesce(v_available,0)<v_qty then
      raise exception '% only has % available at this depot.',coalesce(v_item.part_number,v_item.description),coalesce(v_available,0);
    end if;

    v_net:=round(v_qty*v_price*(1-v_discount/100),2);
    v_vat:=round(v_net*(coalesce(v_item.vat_rate,20)/100),2);
    v_subtotal:=v_subtotal+v_net;
    v_vat_total:=v_vat_total+v_vat;
  end loop;
  v_total:=round(v_subtotal+v_vat_total,2);

  insert into invoices(
    company_id,commercial_type,invoice_number,job_id,customer_id,status,issue_date,due_date,
    subtotal,vat_rate,vat_amount,total,amount_paid,customer_name,customer_email,customer_phone,
    billing_address,notes,payment_terms,payment_method,paid_at,created_by
  ) values (
    p_company,'parts',p_invoice_number,null,p_customer,
    case when p_mark_paid then 'paid' else 'draft' end,current_date,
    case when p_mark_paid then current_date else current_date+7 end,
    v_subtotal,0,v_vat_total,v_total,case when p_mark_paid then v_total else 0 end,
    coalesce(nullif(trim(p_customer_name),''),'Counter Sale'),nullif(trim(p_customer_email),''),
    nullif(trim(p_customer_phone),''),nullif(trim(p_billing_address),''),nullif(trim(p_notes),''),
    case when p_mark_paid then 'Paid at counter' else 'Payment due within 7 days' end,
    v_payment,case when p_mark_paid then now() else null end,p_user
  ) returning id into v_invoice;

  insert into parts_counter_sales(company_id,branch_id,invoice_id,customer_id,payment_method,created_by)
  values(p_company,p_branch,v_invoice,p_customer,v_payment,p_user) returning id into v_sale;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_qty:=round(greatest(0,coalesce((v_line->>'quantity')::numeric,0)),3);
    v_price:=round(greatest(0,coalesce((v_line->>'unit_price')::numeric,0)),2);
    v_discount:=least(100,greatest(0,coalesce((v_line->>'discount_percent')::numeric,0)));
    select s.id,s.part_number,s.description,s.vat_rate,s.unit_cost into v_item
      from stock_items s where s.id=(v_line->>'stock_item_id')::uuid and s.company_id=p_company;
    v_net:=round(v_qty*v_price*(1-v_discount/100),2);

    insert into invoice_items(company_id,invoice_id,item_type,source_id,description,quantity,unit_price,line_total,sort_order)
    values(p_company,v_invoice,'part',v_item.id,
      concat_ws(' - ',nullif(v_item.part_number,''),v_item.description),v_qty,
      round(v_price*(1-v_discount/100),2),v_net,v_sort);
    v_sort:=v_sort+1;

    insert into stock_movements(company_id,branch_id,stock_item_id,movement_type,quantity,unit_cost,reference,notes,created_by)
    values(p_company,p_branch,v_item.id,'counter_sale',-v_qty,v_item.unit_cost,p_invoice_number,
      case when v_discount>0 then concat('Parts counter sale; discount ',v_discount,'%') else 'Parts counter sale' end,p_user);
  end loop;

  return jsonb_build_object('sale_id',v_sale,'invoice_id',v_invoice,'invoice_number',p_invoice_number,'total',v_total);
end $$;

revoke all on function public.agricore_create_parts_counter_sale(uuid,uuid,uuid,uuid,text,text,text,text,text,text,boolean,text,jsonb) from public,authenticated;
grant execute on function public.agricore_create_parts_counter_sale(uuid,uuid,uuid,uuid,text,text,text,text,text,text,boolean,text,jsonb) to service_role;

commit;
