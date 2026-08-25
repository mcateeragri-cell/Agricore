begin;
create table if not exists public.company_mfa_policies (
 company_id uuid primary key references public.companies(id) on delete cascade,
 required_roles text[] not null default array['company_admin','administrator']::text[],
 updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now(),
 constraint company_mfa_required_roles_valid check(required_roles <@ array['company_admin','administrator','service_manager','office','parts_manager','parts_advisor','sales_manager','salesperson','technician','apprentice','read_only']::text[])
);
insert into public.company_mfa_policies(company_id,required_roles) select id,array['company_admin','administrator']::text[] from public.companies on conflict(company_id) do nothing;
alter table public.company_mfa_policies enable row level security;
drop policy if exists "Company members can read MFA policy" on public.company_mfa_policies;
create policy "Company members can read MFA policy" on public.company_mfa_policies for select to authenticated using(
 exists(select 1 from public.company_members cm where cm.company_id=company_mfa_policies.company_id and cm.user_id=auth.uid() and cm.is_active=true)
 or exists(select 1 from public.platform_user_roles p where p.user_id=auth.uid() and p.role in('super_admin','platform_admin','support'))
);
revoke insert,update,delete on public.company_mfa_policies from authenticated,anon; revoke all on public.company_mfa_policies from anon;
commit;
