-- AgriCore Enterprise Multi-Branch Pack D
-- Depot management KPIs, branch managers and audited operational transfers.

begin;

alter table public.company_branches
  add column if not exists manager_user_id uuid references auth.users(id) on delete set null;

create index if not exists company_branches_manager_idx
  on public.company_branches(company_id, manager_user_id)
  where manager_user_id is not null;

create table if not exists public.branch_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  entity_label text,
  from_branch_id uuid not null references public.company_branches(id) on delete restrict,
  to_branch_id uuid not null references public.company_branches(id) on delete restrict,
  reason text,
  status text not null default 'completed',
  requested_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint branch_transfer_entity_type_check check (entity_type in ('job','customer','machine','technician')),
  constraint branch_transfer_status_check check (status in ('pending','completed','cancelled','failed')),
  constraint branch_transfer_different_branches_check check (from_branch_id <> to_branch_id)
);

create index if not exists branch_transfer_company_created_idx
  on public.branch_transfer_requests(company_id, requested_at desc);
create index if not exists branch_transfer_company_branch_idx
  on public.branch_transfer_requests(company_id, from_branch_id, to_branch_id, requested_at desc);

alter table public.branch_transfer_requests enable row level security;

drop policy if exists "Branch scoped members read transfers" on public.branch_transfer_requests;
create policy "Branch scoped members read transfers"
on public.branch_transfer_requests
for select to authenticated
using (
  public.agricore_branch_scope_allows(company_id, from_branch_id, 'operations')
  or public.agricore_branch_scope_allows(company_id, to_branch_id, 'operations')
);

-- Operational writes are intentionally performed through authenticated server routes
-- using the service-role client after role + branch-scope validation. No direct client
-- insert/update/delete policies are granted on the audit table.

commit;
