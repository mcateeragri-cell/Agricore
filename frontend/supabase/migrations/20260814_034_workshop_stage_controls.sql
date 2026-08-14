begin;

alter table public.company_workshop_stages
  add column if not exists gate_type text not null default 'none',
  add column if not exists gate_required boolean not null default false;

alter table public.company_workshop_stages
  drop constraint if exists company_workshop_stages_gate_type_check;

alter table public.company_workshop_stages
  add constraint company_workshop_stages_gate_type_check
  check (gate_type in ('none','waiting_parts','quality_check','manager_approval','warranty_review'));

-- Assign sensible controls to the standard workflow without forcing custom workflows.
update public.company_workshop_stages s
set gate_type = case
      when s.slug = 'waiting_parts' then 'waiting_parts'
      when s.slug = 'quality_check' then 'quality_check'
      when s.slug = 'manager_review' then 'manager_approval'
      else gate_type
    end,
    gate_required = case
      when s.slug in ('waiting_parts','quality_check','manager_review') then true
      else gate_required
    end,
    updated_at = now()
from public.company_workshop_workflows w
where s.workflow_id = w.id
  and w.slug = 'default';

-- Add an optional Warranty Review stage to the standard workflow if it does not already exist.
update public.company_workshop_stages s
set position = position + 1,
    updated_at = now()
from public.company_workshop_workflows w
where s.workflow_id = w.id
  and w.slug = 'default'
  and s.position >= 6
  and not exists (
    select 1 from public.company_workshop_stages existing
    where existing.workflow_id = w.id and existing.slug = 'warranty_review'
  );

insert into public.company_workshop_stages (
  company_id, workflow_id, name, slug, position, status_mapping, colour,
  is_terminal, gate_type, gate_required, active
)
select w.company_id, w.id, 'Warranty Review', 'warranty_review', 6,
       'in_progress', '#b45309', false, 'warranty_review', false, true
from public.company_workshop_workflows w
where w.slug = 'default'
on conflict (workflow_id, slug) do nothing;

create table if not exists public.job_workshop_part_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  stock_item_id uuid references public.stock_items(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  part_number text,
  description text not null,
  quantity_required numeric(12,3) not null default 1 check (quantity_required > 0),
  quantity_reserved numeric(12,3) not null default 0 check (quantity_reserved >= 0),
  status text not null default 'required'
    check (status in ('required','reserved','ordered','available','received','backorder','waived')),
  supplier_eta date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_workshop_part_requirements_job_idx
  on public.job_workshop_part_requirements(company_id, job_id, status);

create table if not exists public.company_workshop_qc_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  description text,
  position integer not null default 0,
  required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_workshop_qc_items_company_idx
  on public.company_workshop_qc_items(company_id, active, position);

insert into public.company_workshop_qc_items (company_id, label, position, required)
select c.id, item.label, item.position, true
from public.companies c
cross join (values
  ('Fault resolved / repair verified', 0),
  ('No leaks or loose components found', 1),
  ('Functional test / test run completed', 2),
  ('Safety guards and covers refitted', 3),
  ('Job notes and parts usage complete', 4)
) as item(label, position)
where not exists (
  select 1 from public.company_workshop_qc_items existing
  where existing.company_id = c.id
);

create table if not exists public.job_workshop_qc_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  qc_item_id uuid not null references public.company_workshop_qc_items(id) on delete cascade,
  result text not null default 'pending' check (result in ('pending','pass','fail','not_applicable')),
  notes text,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(job_id, qc_item_id)
);

create table if not exists public.job_workshop_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists job_workshop_approvals_job_idx
  on public.job_workshop_approvals(company_id, job_id, created_at desc);

create table if not exists public.job_warranty_reviews (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  warranty_type text check (warranty_type in ('manufacturer','dealer_goodwill','internal','not_warranty')),
  manufacturer text,
  claim_reference text,
  claim_status text not null default 'draft'
    check (claim_status in ('draft','ready','submitted','approved','rejected','paid','not_applicable')),
  review_status text not null default 'pending'
    check (review_status in ('pending','reviewed','not_warranty','approved')),
  expected_value numeric(12,2),
  reimbursed_value numeric(12,2),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.job_workshop_part_requirements enable row level security;
alter table public.company_workshop_qc_items enable row level security;
alter table public.job_workshop_qc_checks enable row level security;
alter table public.job_workshop_approvals enable row level security;
alter table public.job_warranty_reviews enable row level security;

-- Read access follows active company membership. Server APIs enforce write permissions and depot scope.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'job_workshop_part_requirements',
    'company_workshop_qc_items',
    'job_workshop_qc_checks',
    'job_workshop_approvals',
    'job_warranty_reviews'
  ] loop
    execute format('drop policy if exists "Members read %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "Members read %s" on public.%I for select to authenticated using (exists(select 1 from public.company_members m where m.company_id=%I.company_id and m.user_id=auth.uid() and m.is_active=true))',
      table_name, table_name, table_name
    );
  end loop;
end $$;

-- Company administrators and service managers may maintain the company QC template.
drop policy if exists "Managers manage workshop QC template" on public.company_workshop_qc_items;
create policy "Managers manage workshop QC template"
on public.company_workshop_qc_items for all to authenticated
using (
  exists(select 1 from public.company_member_roles r
    where r.company_id=company_workshop_qc_items.company_id
      and r.user_id=auth.uid()
      and r.role in ('company_admin','administrator','service_manager'))
)
with check (
  exists(select 1 from public.company_member_roles r
    where r.company_id=company_workshop_qc_items.company_id
      and r.user_id=auth.uid()
      and r.role in ('company_admin','administrator','service_manager'))
);

commit;
