begin;

insert into public.platform_features(feature_key,feature_name,description,default_enabled)
values (
  'network_provider_marketplace',
  'AgriCore Network Provider Marketplace',
  'Approved public provider profiles and direct customer requests through AgriCore Network.',
  false
)
on conflict(feature_key) do update
set feature_name=excluded.feature_name,
    description=excluded.description;

insert into public.subscription_plan_features(plan_id,feature_key,enabled)
select p.id,'network_provider_marketplace',
  case when p.slug in ('professional','enterprise') then true else false end
from public.subscription_plans p
where p.slug in ('starter','professional','enterprise')
on conflict(plan_id,feature_key) do update set enabled=excluded.enabled;

create table if not exists public.network_provider_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  public_slug text not null unique,
  opted_in boolean not null default false,
  approval_status text not null default 'draft'
    check(approval_status in ('draft','pending','approved','suspended','rejected')),
  display_name text not null,
  description text,
  town_city text,
  postcode text,
  service_radius_miles integer not null default 30 check(service_radius_miles between 1 and 500),
  emergency_callouts boolean not null default false,
  phone text,
  email text,
  website text,
  brands text[] not null default '{}',
  services text[] not null default '{}',
  business_verification text not null default 'not_checked'
    check(business_verification in ('not_checked','verified','failed')),
  identity_verification text not null default 'not_checked'
    check(identity_verification in ('not_checked','verified','failed')),
  insurance_verification text not null default 'not_checked'
    check(insurance_verification in ('not_checked','verified','expired','failed')),
  insurance_expiry date,
  application_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists network_provider_public_idx
  on public.network_provider_profiles(approval_status,opted_in,updated_at desc);
create index if not exists network_provider_location_idx
  on public.network_provider_profiles(town_city,postcode);

alter table public.network_provider_profiles enable row level security;
revoke all on public.network_provider_profiles from anon,authenticated;
grant all on public.network_provider_profiles to service_role;

create table if not exists public.network_provider_requests (
  id uuid primary key default gen_random_uuid(),
  provider_company_id uuid not null references public.companies(id) on delete cascade,
  provider_profile_id uuid not null references public.network_provider_profiles(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  location text not null,
  machine_description text,
  service_required text not null,
  urgency text not null default 'routine'
    check(urgency in ('routine','soon','urgent','breakdown')),
  preferred_contact text not null default 'phone'
    check(preferred_contact in ('phone','email','whatsapp')),
  message text,
  status text not null default 'submitted'
    check(status in ('submitted','viewed','accepted','declined','converted','completed','cancelled')),
  source text not null default 'network_direct',
  accepted_job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists network_provider_requests_company_idx
  on public.network_provider_requests(provider_company_id,status,created_at desc);

alter table public.network_provider_requests enable row level security;
revoke all on public.network_provider_requests from anon,authenticated;
grant all on public.network_provider_requests to service_role;

create table if not exists public.network_provider_reports (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.network_provider_profiles(id) on delete cascade,
  provider_company_id uuid not null references public.companies(id) on delete cascade,
  reporter_name text,
  reporter_email text,
  reason text not null,
  detail text,
  status text not null default 'open'
    check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists network_provider_reports_status_idx
  on public.network_provider_reports(status,created_at desc);

alter table public.network_provider_reports enable row level security;
revoke all on public.network_provider_reports from anon,authenticated;
grant all on public.network_provider_reports to service_role;

-- Hard stop: demo workspaces can never opt into the public provider marketplace.
create or replace function public.network_reject_demo_provider()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare c record;
begin
  select id,slug,billing_mode,is_active into c
  from public.companies where id=new.company_id;

  if not found then
    raise exception 'Company does not exist.';
  end if;

  if c.billing_mode='demo' or c.slug like 'demo-%' then
    if new.opted_in or new.approval_status in ('pending','approved') then
      raise exception 'Demo workspaces cannot join the public AgriCore Network.';
    end if;
  end if;

  if c.is_active is not true and new.approval_status='approved' then
    raise exception 'Inactive companies cannot be approved for AgriCore Network.';
  end if;

  return new;
end $$;

drop trigger if exists network_provider_demo_guard on public.network_provider_profiles;
create trigger network_provider_demo_guard
before insert or update on public.network_provider_profiles
for each row execute function public.network_reject_demo_provider();

commit;
