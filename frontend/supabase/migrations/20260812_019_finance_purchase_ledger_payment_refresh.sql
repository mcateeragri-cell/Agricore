-- AgriCore Finance 2E
-- Keep supplier invoice paid/status values in sync when payment status changes.

begin;

create or replace function public.finance_recalculate_purchase_invoice_payment(
  p_purchase_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(18,2);
  v_total numeric(18,2);
begin
  select coalesce(sum(a.amount), 0)
  into v_paid
  from public.finance_supplier_payment_allocations a
  join public.finance_supplier_payments p
    on p.id = a.payment_id
  where a.purchase_invoice_id = p_purchase_invoice_id
    and p.status = 'posted';

  select total
  into v_total
  from public.finance_purchase_invoices
  where id = p_purchase_invoice_id;

  if v_total is null then
    return;
  end if;

  update public.finance_purchase_invoices
  set
    amount_paid = round(v_paid, 2),
    status = case
      when status = 'void' then status
      when v_paid <= 0 then
        case when status in ('part_paid', 'paid') then 'posted' else status end
      when v_paid + 0.01 >= v_total then 'paid'
      else 'part_paid'
    end,
    updated_at = now()
  where id = p_purchase_invoice_id;
end;
$$;

create or replace function public.finance_refresh_purchase_invoices_for_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  for v_invoice_id in
    select distinct purchase_invoice_id
    from public.finance_supplier_payment_allocations
    where payment_id = new.id
  loop
    perform public.finance_recalculate_purchase_invoice_payment(v_invoice_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists finance_refresh_purchase_invoices_for_payment_status
on public.finance_supplier_payments;

create trigger finance_refresh_purchase_invoices_for_payment_status
after insert or update of status
on public.finance_supplier_payments
for each row
execute function public.finance_refresh_purchase_invoices_for_payment_status();

-- Reuse one recalculation function for allocation changes too.
create or replace function public.finance_refresh_purchase_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
begin
  v_invoice_id := case
    when tg_op = 'DELETE' then old.purchase_invoice_id
    else new.purchase_invoice_id
  end;

  perform public.finance_recalculate_purchase_invoice_payment(v_invoice_id);

  if tg_op = 'UPDATE' and old.purchase_invoice_id <> new.purchase_invoice_id then
    perform public.finance_recalculate_purchase_invoice_payment(old.purchase_invoice_id);
  end if;

  return coalesce(new, old);
end;
$$;

commit;
