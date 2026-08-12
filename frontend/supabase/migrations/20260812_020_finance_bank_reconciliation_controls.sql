begin;

-- AgriCore Finance 2E
-- Bank reconciliation tenant integrity, matching controls and import audit fields.

alter table public.finance_bank_transactions
  add column if not exists import_batch text,
  add column if not exists imported_by uuid;

create index if not exists finance_bank_transactions_batch_idx
  on public.finance_bank_transactions(company_id, bank_account_id, import_batch)
  where import_batch is not null;

create or replace function public.finance_validate_bank_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  select account_type
  into v_type
  from public.finance_accounts
  where id = new.finance_account_id
    and company_id = new.company_id
    and active = true;

  if v_type is null then
    raise exception 'The linked finance account is missing, inactive or belongs to another company.';
  end if;

  if v_type <> 'asset' then
    raise exception 'A bank account must be linked to an asset finance account.';
  end if;

  return new;
end;
$$;

drop trigger if exists finance_validate_bank_account
  on public.finance_bank_accounts;
create trigger finance_validate_bank_account
before insert or update
on public.finance_bank_accounts
for each row execute function public.finance_validate_bank_account();

create or replace function public.finance_validate_bank_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.finance_bank_accounts b
    where b.id = new.bank_account_id
      and b.company_id = new.company_id
      and b.active = true
  ) then
    raise exception 'Bank transaction account is invalid for this company.';
  end if;

  if new.amount = 0 then
    raise exception 'Bank transaction amount cannot be zero.';
  end if;

  return new;
end;
$$;

drop trigger if exists finance_validate_bank_transaction
  on public.finance_bank_transactions;
create trigger finance_validate_bank_transaction
before insert or update
on public.finance_bank_transactions
for each row execute function public.finance_validate_bank_transaction();

create or replace function public.finance_validate_supplier_payment_bank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bank_account_id is not null
     and not exists (
       select 1
       from public.finance_bank_accounts b
       where b.id = new.bank_account_id
         and b.company_id = new.company_id
         and b.active = true
     )
  then
    raise exception 'Supplier payment bank account is invalid for this company.';
  end if;

  return new;
end;
$$;

drop trigger if exists finance_validate_supplier_payment_bank
  on public.finance_supplier_payments;
create trigger finance_validate_supplier_payment_bank
before insert or update of bank_account_id, company_id
on public.finance_supplier_payments
for each row execute function public.finance_validate_supplier_payment_bank();

create or replace function public.finance_validate_bank_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_amount numeric(18,2);
  v_other_matches numeric(18,2);
begin
  select abs(amount)
  into v_transaction_amount
  from public.finance_bank_transactions
  where id = new.bank_transaction_id
    and company_id = new.company_id;

  if v_transaction_amount is null then
    raise exception 'Bank transaction does not belong to this company.';
  end if;

  if new.journal_id is not null
     and not exists (
       select 1
       from public.finance_journals j
       where j.id = new.journal_id
         and j.company_id = new.company_id
         and j.status = 'posted'
     )
  then
    raise exception 'Reconciliation journal is not a posted journal for this company.';
  end if;

  if new.supplier_payment_id is not null
     and not exists (
       select 1
       from public.finance_supplier_payments p
       where p.id = new.supplier_payment_id
         and p.company_id = new.company_id
         and p.status = 'posted'
     )
  then
    raise exception 'Reconciliation supplier payment is not posted for this company.';
  end if;

  select coalesce(sum(matched_amount), 0)
  into v_other_matches
  from public.finance_bank_reconciliation_matches
  where bank_transaction_id = new.bank_transaction_id
    and id <> new.id;

  if v_other_matches + new.matched_amount > v_transaction_amount + 0.01 then
    raise exception 'Reconciliation matches exceed the bank transaction amount.';
  end if;

  return new;
end;
$$;

drop trigger if exists finance_validate_bank_match
  on public.finance_bank_reconciliation_matches;
create trigger finance_validate_bank_match
before insert or update
on public.finance_bank_reconciliation_matches
for each row execute function public.finance_validate_bank_match();

create or replace function public.finance_refresh_bank_transaction_reconciliation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_amount numeric(18,2);
  v_matched numeric(18,2);
begin
  v_transaction_id := case when tg_op = 'DELETE' then old.bank_transaction_id else new.bank_transaction_id end;

  select abs(amount)
  into v_amount
  from public.finance_bank_transactions
  where id = v_transaction_id;

  if v_amount is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(matched_amount), 0)
  into v_matched
  from public.finance_bank_reconciliation_matches
  where bank_transaction_id = v_transaction_id;

  update public.finance_bank_transactions
  set reconciliation_status = case
      when v_matched <= 0.009 then 'unmatched'
      when v_matched + 0.01 >= v_amount then 'matched'
      else 'part_matched'
    end,
    updated_at = now()
  where id = v_transaction_id
    and reconciliation_status <> 'ignored';

  return coalesce(new, old);
end;
$$;

drop trigger if exists finance_refresh_bank_transaction_reconciliation
  on public.finance_bank_reconciliation_matches;
create trigger finance_refresh_bank_transaction_reconciliation
after insert or update or delete
on public.finance_bank_reconciliation_matches
for each row execute function public.finance_refresh_bank_transaction_reconciliation();

revoke all on function public.finance_validate_bank_account() from public, anon;
revoke all on function public.finance_validate_bank_transaction() from public, anon;
revoke all on function public.finance_validate_supplier_payment_bank() from public, anon;
revoke all on function public.finance_validate_bank_match() from public, anon;
revoke all on function public.finance_refresh_bank_transaction_reconciliation() from public, anon;

commit;
