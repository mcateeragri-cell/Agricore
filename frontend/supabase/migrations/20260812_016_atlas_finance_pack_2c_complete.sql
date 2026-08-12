-- AgriCore Platform Pack 2C — Credit Notes, Finance Dashboard & Accountant Workspace
begin;

create table if not exists public.finance_credit_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  credit_note_number text not null,
  status text not null default 'draft',
  issue_date date not null default current_date,
  reason text,
  subtotal numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  currency_code text not null default 'GBP',
  issued_at timestamptz,
  issued_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, credit_note_number),
  constraint finance_credit_notes_status_check check (status in ('draft','issued','void')),
  constraint finance_credit_notes_amounts_check check (subtotal >= 0 and tax_amount >= 0 and total >= 0 and abs(total-(subtotal+tax_amount)) <= 0.01)
);

create table if not exists public.finance_credit_note_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  credit_note_id uuid not null references public.finance_credit_notes(id) on delete cascade,
  item_type text not null default 'other',
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(18,2) not null default 0,
  line_total numeric(18,2) not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint finance_credit_note_lines_amount_check check (quantity >= 0 and unit_price >= 0 and line_total >= 0)
);

create index if not exists finance_credit_notes_company_idx on public.finance_credit_notes(company_id, issue_date desc, created_at desc);
create index if not exists finance_credit_notes_invoice_idx on public.finance_credit_notes(company_id, invoice_id, status);
create index if not exists finance_credit_note_lines_note_idx on public.finance_credit_note_lines(company_id, credit_note_id, sort_order);

-- Enforce tenant integrity and prevent over-crediting even if data is written outside the UI.
create or replace function public.finance_validate_credit_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_total numeric(18,2);
  v_other_credits numeric(18,2);
  v_line_subtotal numeric(18,2);
begin
  select total into v_invoice_total from public.invoices where id=NEW.invoice_id and company_id=NEW.company_id;
  if v_invoice_total is null then raise exception 'Credit note invoice does not belong to this company.'; end if;
  if NEW.status='issued' then
    select round(coalesce(sum(line_total),0),2) into v_line_subtotal from public.finance_credit_note_lines where credit_note_id=NEW.id and company_id=NEW.company_id;
    if abs(v_line_subtotal-NEW.subtotal) > 0.01 then raise exception 'Credit note line subtotal does not match document subtotal.'; end if;
    select round(coalesce(sum(total),0),2) into v_other_credits from public.finance_credit_notes where company_id=NEW.company_id and invoice_id=NEW.invoice_id and status='issued' and id<>NEW.id;
    if v_other_credits + NEW.total > v_invoice_total + 0.01 then raise exception 'Credit note would exceed the original invoice total.'; end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists finance_validate_credit_note on public.finance_credit_notes;
create trigger finance_validate_credit_note
before insert or update of status, subtotal, tax_amount, total, invoice_id on public.finance_credit_notes
for each row execute function public.finance_validate_credit_note();

create or replace function public.finance_validate_credit_note_line()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.finance_credit_notes n where n.id=NEW.credit_note_id and n.company_id=NEW.company_id and n.status='draft') then
    raise exception 'Credit note lines may only be changed on a draft credit note in the same company.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists finance_validate_credit_note_line on public.finance_credit_note_lines;
create trigger finance_validate_credit_note_line
before insert or update on public.finance_credit_note_lines
for each row execute function public.finance_validate_credit_note_line();

create or replace function public.finance_capture_credit_note_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status='issued' and (TG_OP='INSERT' or OLD.status <> 'issued') then
    insert into public.atlas_events(company_id,event_type,entity_type,entity_id,payload)
    values (NEW.company_id,'finance.credit_note.issued','credit_note',NEW.id::text,
      jsonb_build_object('credit_note_id',NEW.id,'invoice_id',NEW.invoice_id,'credit_note_number',NEW.credit_note_number,'total',NEW.total));
  end if;
  return NEW;
end;
$$;

drop trigger if exists finance_capture_credit_note_event on public.finance_credit_notes;
create trigger finance_capture_credit_note_event
after insert or update of status on public.finance_credit_notes
for each row execute function public.finance_capture_credit_note_event();

alter table public.finance_credit_notes enable row level security;
alter table public.finance_credit_note_lines enable row level security;

do $$
declare t text;
begin
  foreach t in array array['finance_credit_notes','finance_credit_note_lines'] loop
    execute format('drop policy if exists "Company members can read %s" on public.%I',t,t);
    execute format('create policy "Company members can read %s" on public.%I for select to authenticated using (exists (select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=auth.uid() and cm.is_active=true))',t,t,t);
    execute format('drop policy if exists "Finance managers can manage %s" on public.%I',t,t);
    execute format('create policy "Finance managers can manage %s" on public.%I for all to authenticated using (exists (select 1 from public.company_member_roles r where r.company_id=%I.company_id and r.user_id=auth.uid() and r.role in (''company_admin'',''administrator''))) with check (exists (select 1 from public.company_member_roles r where r.company_id=%I.company_id and r.user_id=auth.uid() and r.role in (''company_admin'',''administrator'')))',t,t,t,t);
  end loop;
end $$;

revoke all on public.finance_credit_notes from anon;
revoke all on public.finance_credit_note_lines from anon;

commit;
