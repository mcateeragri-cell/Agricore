-- AgriCore Platform Pack 2B — Atlas Finance Ledger & Journal Engine
-- Adds idempotent double-entry posting, invoice/payment event capture and finance queue work.

begin;

alter table public.finance_journals
  add column if not exists source_action text not null default 'general',
  add column if not exists source_event_id uuid references public.atlas_events(id) on delete set null;

alter table public.finance_journals
  drop constraint if exists finance_journals_company_id_source_type_source_id_key;

drop index if exists finance_journals_source_action_uidx;
create unique index finance_journals_source_action_uidx
  on public.finance_journals(company_id, source_type, source_id, source_action)
  where source_type is not null and source_id is not null;
create index if not exists finance_journals_source_event_idx on public.finance_journals(source_event_id);

-- Atomic journal poster. All operational modules post through this RPC via the server-side Finance service.
create or replace function public.finance_post_journal(
  p_company_id uuid,
  p_source_type text,
  p_source_id text,
  p_source_action text,
  p_source_event_id uuid,
  p_journal_date date,
  p_currency_code text,
  p_reference text,
  p_description text,
  p_lines jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_journal_id uuid;
  v_period_id uuid;
  v_profile public.finance_profiles%rowtype;
  v_line jsonb;
  v_account_id uuid;
  v_tax_code_id uuid;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
  v_tax_amount numeric(18,2);
  v_debits numeric(18,2) := 0;
  v_credits numeric(18,2) := 0;
  v_count integer := 0;
begin
  if p_company_id is null or coalesce(trim(p_source_type),'') = '' or coalesce(trim(p_source_id),'') = '' or coalesce(trim(p_source_action),'') = '' then
    raise exception 'Finance posting requires company, source type, source id and source action.';
  end if;

  -- Prevent concurrent retries from creating duplicate source journals.
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || p_source_type || ':' || p_source_id || ':' || p_source_action, 0));

  select id into v_existing
  from public.finance_journals
  where company_id = p_company_id
    and source_type = p_source_type
    and source_id = p_source_id
    and source_action = p_source_action
  limit 1;
  if v_existing is not null then return v_existing; end if;

  select * into v_profile from public.finance_profiles where company_id = p_company_id;
  if not found then raise exception 'Finance profile is not configured for company %.', p_company_id; end if;
  if upper(coalesce(p_currency_code,'')) <> upper(v_profile.base_currency_code) then
    raise exception 'Posting currency % does not match company base currency %.', p_currency_code, v_profile.base_currency_code;
  end if;

  select id into v_period_id
  from public.finance_periods
  where company_id = p_company_id
    and p_journal_date between starts_on and ends_on
    and status = 'open'
  order by starts_on desc
  limit 1;
  if v_period_id is null then raise exception 'No open financial period contains %.', p_journal_date; end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'A journal requires at least two lines.';
  end if;

  -- Validate all lines before creating the header.
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_count := v_count + 1;
    v_debit := round(coalesce((v_line->>'debit')::numeric,0),2);
    v_credit := round(coalesce((v_line->>'credit')::numeric,0),2);
    v_tax_amount := round(coalesce((v_line->>'tax_amount')::numeric,0),2);
    if v_debit < 0 or v_credit < 0 or v_tax_amount < 0 or ((v_debit > 0) = (v_credit > 0)) then
      raise exception 'Invalid debit/credit values on finance line %.', v_count;
    end if;
    select id into v_account_id from public.finance_accounts
      where company_id = p_company_id and system_key = v_line->>'account_system_key' and active = true;
    if v_account_id is null then raise exception 'Required finance account % is missing or inactive.', v_line->>'account_system_key'; end if;
    if nullif(v_line->>'tax_code','') is not null then
      select id into v_tax_code_id from public.finance_tax_codes
        where company_id = p_company_id and code = v_line->>'tax_code' and active = true;
      if v_tax_code_id is null then raise exception 'Required tax code % is missing or inactive.', v_line->>'tax_code'; end if;
    end if;
    v_debits := v_debits + v_debit;
    v_credits := v_credits + v_credit;
  end loop;
  if abs(v_debits - v_credits) > 0.01 then
    raise exception 'Journal is not balanced. Debits %, credits %.', v_debits, v_credits;
  end if;

  insert into public.finance_journals(
    company_id, period_id, journal_date, status, source_type, source_id, source_action,
    source_event_id, reference, description, currency_code, posted_at, metadata
  ) values (
    p_company_id, v_period_id, p_journal_date, 'posted', p_source_type, p_source_id, p_source_action,
    p_source_event_id, nullif(trim(p_reference),''), nullif(trim(p_description),''), upper(p_currency_code), now(), coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_journal_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    select id into v_account_id from public.finance_accounts
      where company_id = p_company_id and system_key = v_line->>'account_system_key' and active = true;
    v_tax_code_id := null;
    if nullif(v_line->>'tax_code','') is not null then
      select id into v_tax_code_id from public.finance_tax_codes
        where company_id = p_company_id and code = v_line->>'tax_code' and active = true;
    end if;
    insert into public.finance_journal_lines(
      journal_id, company_id, account_id, tax_code_id, description, debit, credit, tax_amount, metadata
    ) values (
      v_journal_id, p_company_id, v_account_id, v_tax_code_id, nullif(trim(v_line->>'description'),''),
      round(coalesce((v_line->>'debit')::numeric,0),2), round(coalesce((v_line->>'credit')::numeric,0),2),
      round(coalesce((v_line->>'tax_amount')::numeric,0),2), coalesce(v_line->'metadata','{}'::jsonb)
    );
  end loop;

  return v_journal_id;
end;
$$;
revoke all on function public.finance_post_journal(uuid,text,text,text,uuid,date,text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.finance_post_journal(uuid,text,text,text,uuid,date,text,text,text,jsonb,jsonb) to service_role;

-- Capture invoice financial lifecycle changes at database level so UI, webhooks and API updates share one path.
create or replace function public.finance_capture_invoice_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_paid numeric(18,2) := case when TG_OP='INSERT' then 0 else coalesce(OLD.amount_paid,0) end;
  v_new_paid numeric(18,2) := coalesce(NEW.amount_paid,0);
  v_issue boolean := false;
  v_payment numeric(18,2) := greatest(0, v_new_paid - v_old_paid);
  v_was_issued boolean := false;
begin
  if TG_OP = 'UPDATE' then
    v_was_issued := OLD.status in ('sent','part_paid','paid','overdue');
  end if;
  v_issue := NEW.status in ('sent','part_paid','paid','overdue') and not v_was_issued;

  if v_issue then
    insert into public.atlas_events(company_id,event_type,entity_type,entity_id,payload)
    values (NEW.company_id,'finance.invoice.issued','invoice',NEW.id::text,
      jsonb_build_object('invoice_id',NEW.id,'invoice_number',NEW.invoice_number,'status',NEW.status));
  end if;

  if v_payment > 0 then
    insert into public.atlas_events(company_id,event_type,entity_type,entity_id,payload)
    values (NEW.company_id,'finance.invoice.payment_recorded','invoice',NEW.id::text,
      jsonb_build_object('invoice_id',NEW.id,'invoice_number',NEW.invoice_number,'payment_delta',v_payment,'amount_paid',v_new_paid,'status',NEW.status));
  end if;

  if TG_OP='UPDATE' and NEW.status='void' and OLD.status <> 'void' and v_was_issued then
    insert into public.atlas_events(company_id,event_type,entity_type,entity_id,payload)
    values (NEW.company_id,'finance.invoice.voided','invoice',NEW.id::text,
      jsonb_build_object('invoice_id',NEW.id,'invoice_number',NEW.invoice_number,'amount_paid',v_new_paid));
  end if;
  return NEW;
end;
$$;

drop trigger if exists finance_capture_invoice_event on public.invoices;
create trigger finance_capture_invoice_event
after insert or update of status, amount_paid on public.invoices
for each row execute function public.finance_capture_invoice_event();

-- Finance events receive a dedicated queue task; normal Atlas event processing remains intact.
create or replace function public.finance_enqueue_atlas_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.event_type like 'finance.%' then
    insert into public.atlas_queue(company_id,source_event_id,task_type,entity_type,entity_id,payload)
    values (NEW.company_id,NEW.id,'finance_posting',NEW.entity_type,NEW.entity_id,NEW.payload)
    on conflict (source_event_id,task_type) do nothing;
  end if;
  return NEW;
end;
$$;
drop trigger if exists finance_queue_atlas_event on public.atlas_events;
create trigger finance_queue_atlas_event
after insert on public.atlas_events
for each row execute function public.finance_enqueue_atlas_event();

comment on function public.finance_post_journal is 'Atomic idempotent double-entry poster used by Atlas Finance server services.';
comment on column public.finance_journals.source_action is 'Distinct financial action for a source document, e.g. invoice_issued or customer_payment.';

commit;
