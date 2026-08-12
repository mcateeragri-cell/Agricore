begin;

-- Central audit trail for destructive administration actions.
create table if not exists public.data_management_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid,
  entity_type text not null,
  entity_id uuid,
  entity_reference text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_management_audit_company_created_idx
  on public.data_management_audit (company_id, created_at desc);

alter table public.data_management_audit enable row level security;

drop policy if exists "Company administrators can read data-management audit" on public.data_management_audit;
create policy "Company administrators can read data-management audit"
  on public.data_management_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = data_management_audit.company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
    )
  );

-- AgriCore already performs stock quantity + movement writes explicitly in its
-- job-parts API. Remove any legacy job_parts_used trigger whose function also
-- writes stock_movements; those triggers duplicate current application logic and
-- can fail on DELETE when they reference NEW.company_id instead of OLD.company_id.
do $$
declare
  trigger_row record;
begin
  if to_regclass('public.job_parts_used') is not null then
    for trigger_row in
      select
        t.tgname as trigger_name,
        pg_get_functiondef(t.tgfoid) as function_definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'job_parts_used'
        and not t.tgisinternal
    loop
      if lower(trigger_row.function_definition) like '%stock_movements%' then
        execute format('drop trigger if exists %I on public.job_parts_used', trigger_row.trigger_name);
      end if;
    end loop;
  end if;
end $$;

create or replace function public.agricore_delete_job(
  p_company_id uuid,
  p_job_id uuid,
  p_deleted_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_number text;
  v_invoice_reference text;
  v_part record;
  v_table text;
  v_has_company_id boolean;
begin
  select j.job_number
    into v_job_number
  from public.jobs j
  where j.id = p_job_id
    and j.company_id = p_company_id
  for update;

  if not found then
    raise exception 'Job not found for this company.';
  end if;

  if to_regclass('public.invoices') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'invoices' and column_name = 'job_id'
     ) then
    execute 'select invoice_number::text from public.invoices where company_id = $1 and job_id = $2 limit 1'
      into v_invoice_reference
      using p_company_id, p_job_id;

    if v_invoice_reference is not null then
      raise exception 'Job is linked to invoice % and cannot be permanently deleted.', v_invoice_reference;
    end if;
  end if;

  -- Restore stock used on this test job before removing its part lines.
  if to_regclass('public.job_parts_used') is not null then
    for v_part in
      select stock_item_id, quantity
      from public.job_parts_used
      where job_id = p_job_id
        and company_id = p_company_id
        and stock_item_id is not null
    loop
      if to_regclass('public.stock_items') is not null then
        update public.stock_items
        set quantity_in_stock = coalesce(quantity_in_stock, 0) + coalesce(v_part.quantity, 0),
            updated_at = now()
        where id = v_part.stock_item_id
          and company_id = p_company_id;
      end if;
    end loop;
  end if;

  -- Remove movement rows created by the job/parts before deleting the part lines.
  if to_regclass('public.stock_movements') is not null then
    delete from public.stock_movements
    where company_id = p_company_id
      and (
        job_id = p_job_id
        or job_part_id in (
          select id
          from public.job_parts_used
          where job_id = p_job_id and company_id = p_company_id
        )
      );
  end if;

  -- Known dependent tables. Dynamic cleanup makes this tolerant of older/newer
  -- AgriCore schemas where a particular optional table is absent.
  foreach v_table in array array[
    'job_photos',
    'job_parts',
    'job_parts_used',
    'job_labour_entries',
    'job_travel_sessions',
    'job_assignments',
    'job_completions'
  ]
  loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = v_table and column_name = 'job_id'
       ) then
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = v_table and column_name = 'company_id'
      ) into v_has_company_id;

      if v_has_company_id then
        execute format('delete from public.%I where job_id = $1 and company_id = $2', v_table)
          using p_job_id, p_company_id;
      else
        execute format('delete from public.%I where job_id = $1', v_table)
          using p_job_id;
      end if;
    end if;
  end loop;

  -- Optional historical tables should retain their own record but not a dead job id.
  foreach v_table in array array['machine_service_events']
  loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = v_table and column_name = 'job_id'
       ) then
      execute format('update public.%I set job_id = null where job_id = $1', v_table)
        using p_job_id;
    end if;
  end loop;

  delete from public.jobs
  where id = p_job_id
    and company_id = p_company_id;

  insert into public.data_management_audit (
    company_id,
    user_id,
    entity_type,
    entity_id,
    entity_reference,
    action,
    metadata
  ) values (
    p_company_id,
    p_deleted_by,
    'job',
    p_job_id,
    v_job_number,
    'permanent_delete',
    jsonb_build_object('stock_restored', true)
  );

  return jsonb_build_object(
    'deleted', true,
    'job_id', p_job_id,
    'job_number', v_job_number
  );
end;
$$;

revoke all on function public.agricore_delete_job(uuid, uuid, uuid) from public;
grant execute on function public.agricore_delete_job(uuid, uuid, uuid) to service_role;

commit;
