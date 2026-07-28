alter table public.invoices
  add column if not exists payment_url text,
  add column if not exists payment_provider text,
  add column if not exists revolut_order_id text,
  add column if not exists revolut_order_state text,
  add column if not exists paid_at timestamptz;

create unique index if not exists invoices_revolut_order_id_key on public.invoices (revolut_order_id) where revolut_order_id is not null;

alter table public.invoices drop constraint if exists invoices_payment_provider_check;
alter table public.invoices add constraint invoices_payment_provider_check check (payment_provider is null or payment_provider in ('revolut'));

alter table public.invoices drop constraint if exists invoices_revolut_order_state_check;
alter table public.invoices add constraint invoices_revolut_order_state_check check (revolut_order_state is null or revolut_order_state in ('PENDING','PROCESSING','AUTHORISED','COMPLETED','CANCELLED','FAILED'));
