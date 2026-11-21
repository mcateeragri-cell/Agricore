-- Apply after the existing website enquiry and operator logbook migrations.
begin;
create table if not exists public.agricore_notification_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 branch_id uuid references public.company_branches(id) on delete set null,
 category text not null check (category in ('website_enquiry','breakdown','daily_check','hours')),
 source_id uuid not null,
 title text not null,
 detail text not null default '',
 priority text not null default 'normal' check (priority in ('normal','urgent')),
 created_at timestamptz not null default now(),
 unique(company_id,category,source_id)
);
create index if not exists agricore_notification_events_company_idx on public.agricore_notification_events(company_id,created_at desc);
create table if not exists public.agricore_notification_reads (
 event_id uuid not null references public.agricore_notification_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
create table if not exists public.agricore_notification_deliveries (
 event_id uuid not null references public.agricore_notification_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in ('email','push')),
 delivered_at timestamptz,
 attempt_count integer not null default 0,
 last_error text,
 primary key(event_id,user_id,channel)
);
create table if not exists public.agricore_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 endpoint text not null,
 p256dh text not null,
 auth_secret text not null,
 created_at timestamptz not null default now(),
 unique(user_id,company_id,endpoint)
);
create index if not exists agricore_push_subscriptions_user_idx on public.agricore_push_subscriptions(user_id,company_id);
-- Server-only tables; never expose subscriptions or notification metadata through PostgREST.
alter table public.agricore_notification_events enable row level security;
alter table public.agricore_notification_reads enable row level security;
alter table public.agricore_notification_deliveries enable row level security;
alter table public.agricore_push_subscriptions enable row level security;
revoke all on public.agricore_notification_events,public.agricore_notification_reads,public.agricore_notification_deliveries,public.agricore_push_subscriptions from anon,authenticated;

create or replace function public.agricore_notify_enquiry() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.agricore_notification_events(company_id,branch_id,category,source_id,title,detail,priority)
 values(new.company_id,new.branch_id,'website_enquiry',new.id,'New website enquiry',left(coalesce(new.contact_name,'Customer') || ' - ' || coalesce(new.enquiry_type,'Enquiry'),240),case when lower(coalesce(new.urgency,'')) ~ 'urgent|emergency|critical' then 'urgent' else 'normal' end)
 on conflict do nothing;
 return new;
end $$;
drop trigger if exists agricore_notify_enquiry_insert on public.website_enquiries;
create trigger agricore_notify_enquiry_insert after insert on public.website_enquiries for each row execute function public.agricore_notify_enquiry();

create or replace function public.agricore_notify_operator() returns trigger language plpgsql security definer set search_path=public as $$
declare c record; k text; t text; p text;
begin
 k := case new.kind when 'daily_check' then 'daily_check' when 'breakdown' then 'breakdown' else 'hours' end;
 t := case new.kind when 'daily_check' then 'Daily machine check submitted' when 'breakdown' then 'Machine breakdown reported' else 'Engine hours submitted' end;
 p := case when new.kind='breakdown' or (new.kind='daily_check' and new.checks::text like '%fail%') then 'urgent' else 'normal' end;
 insert into public.agricore_notification_events(company_id,category,source_id,title,detail,priority)
 values(new.company_id,k,new.id,t,left(coalesce(new.operator_name,'Operator') || ' - ' || coalesce(new.description,''),240),p) on conflict do nothing;
 for c in select assigned_company_id from public.machine_company_assignments where machine_id=new.machine_id and enabled=true and can_view_operator_reports=true and assigned_company_id<>new.company_id loop
   insert into public.agricore_notification_events(company_id,category,source_id,title,detail,priority)
   values(c.assigned_company_id,k,new.id,t,left(coalesce(new.operator_name,'Operator') || ' - ' || coalesce(new.description,''),240),p) on conflict do nothing;
 end loop;
 return new;
end $$;
drop trigger if exists agricore_notify_operator_insert on public.machine_operator_submissions;
create trigger agricore_notify_operator_insert after insert on public.machine_operator_submissions for each row execute function public.agricore_notify_operator();
commit;
