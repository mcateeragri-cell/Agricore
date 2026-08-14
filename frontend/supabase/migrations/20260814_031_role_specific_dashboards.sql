begin;

create table if not exists public.company_dashboard_role_layouts (
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null,
  layout jsonb not null default '[]'::jsonb,
  allow_user_customisation boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (company_id, role),
  constraint company_dashboard_role_layouts_role_check check (
    role in (
      'company_default',
      'company_admin',
      'administrator',
      'service_manager',
      'office',
      'parts_manager',
      'read_only'
    )
  )
);

alter table public.company_dashboard_role_layouts enable row level security;
revoke all on public.company_dashboard_role_layouts from anon;

create index if not exists company_dashboard_role_layouts_company_idx
  on public.company_dashboard_role_layouts(company_id);

commit;
