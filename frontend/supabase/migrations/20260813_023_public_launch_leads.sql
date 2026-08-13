-- AgriCore v1.0 launch lead capture
begin;

create table if not exists public.platform_leads (
  id uuid primary key default gen_random_uuid(),
  enquiry_type text not null default 'demo',
  full_name text not null,
  company_name text,
  email text not null,
  phone text,
  country text,
  team_size text,
  message text,
  source_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_leads_type_check check (enquiry_type in ('demo','sales','support','general')),
  constraint platform_leads_status_check check (status in ('new','contacted','qualified','trial','won','closed'))
);

create index if not exists platform_leads_created_idx
  on public.platform_leads(created_at desc);
create index if not exists platform_leads_status_idx
  on public.platform_leads(status, created_at desc);
create index if not exists platform_leads_email_idx
  on public.platform_leads(lower(email));

alter table public.platform_leads enable row level security;
revoke all on public.platform_leads from anon, authenticated;

grant all on public.platform_leads to service_role;

comment on table public.platform_leads is
  'Public AgriCore website enquiries and demo requests. Writes occur through the server-side public contact API only.';

commit;
