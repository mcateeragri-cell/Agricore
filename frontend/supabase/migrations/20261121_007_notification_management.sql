begin;
create table if not exists public.agricore_notification_hidden (
 event_id uuid not null references public.agricore_notification_events(id) on delete cascade,
 user_id uuid not null,
 hidden_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
create index if not exists agricore_notification_hidden_user_idx on public.agricore_notification_hidden(user_id);
alter table public.agricore_notification_hidden enable row level security;
revoke all on public.agricore_notification_hidden from anon,authenticated;
commit;
