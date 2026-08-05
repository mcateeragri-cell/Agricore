-- =====================================================
-- AGRICORE PLATFORM CORE
-- Version: 1.2
-- Migration: 001
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists subscription_plans (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    slug text unique not null,

    description text,

    monthly_price numeric(10,2) default 0,

    yearly_price numeric(10,2) default 0,

    max_users integer default 5,

    max_storage_gb integer default 5,

    trial_days integer default 14,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

insert into subscription_plans
(name,slug,description,monthly_price,yearly_price,max_users,max_storage_gb)

values

('Starter','starter','Starter Plan',39,390,5,10),

('Professional','professional','Professional Plan',99,990,25,100),

('Enterprise','enterprise','Enterprise Plan',299,2990,9999,1000)

on conflict (slug) do nothing;

-- =====================================================
-- COMPANY SUBSCRIPTIONS
-- =====================================================

create table if not exists company_subscriptions (

    id uuid primary key default gen_random_uuid(),

    company_id uuid not null references companies(id) on delete cascade,

    plan_id uuid not null references subscription_plans(id),

    status text not null default 'trial',

    trial_started_at timestamptz default now(),

    trial_ends_at timestamptz,

    subscription_started_at timestamptz,

    subscription_ends_at timestamptz,

    cancelled_at timestamptz,

    payment_provider text,

    payment_customer_id text,

    payment_subscription_id text,

    created_at timestamptz default now(),

    updated_at timestamptz default now(),

    constraint company_subscription_status_check
    check (
        status in (
            'trial',
            'active',
            'cancelled',
            'expired',
            'suspended'
        )
    )
);

create unique index if not exists
idx_company_subscription_company
on company_subscriptions(company_id);

create index if not exists
idx_company_subscription_status
on company_subscriptions(status);

-- =====================================================
-- PLATFORM FEATURES
-- =====================================================

create table if not exists platform_features (

    id uuid primary key default gen_random_uuid(),

    feature_key text unique not null,

    feature_name text not null,

    description text,

    default_enabled boolean default false,

    created_at timestamptz default now()
);

insert into platform_features
(feature_key, feature_name, description, default_enabled)

values

('customers','Customers','Customer management',true),

('machines','Machines','Machine management',true),

('jobs','Jobs','Job management',true),

('quotes','Quotes','Quotation system',true),

('invoices','Invoices','Invoice management',true),

('calendar','Calendar','Scheduling',true),

('stock','Stock','Stock control',true),

('offline_mode','Offline Mode','Offline technician working',false),

('gps_tracking','GPS Tracking','Technician GPS',false),

('service_programmes','Service Programmes','Preventative maintenance',true),

('ai_diagnostics','AI Diagnostics','AI fault diagnosis',false),

('customer_portal','Customer Portal','Customer login portal',false),

('fleet_management','Fleet Management','Fleet management tools',false),

('api_access','API Access','Third-party integrations',false)

on conflict (feature_key) do nothing;

-- =====================================================
-- COMPANY INVITATIONS
-- =====================================================

create table if not exists company_invitations (

    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references companies(id)
        on delete cascade,

    email text not null,

    role text not null,

    invitation_token uuid default gen_random_uuid(),

    expires_at timestamptz not null default (now() + interval '7 days'),

    accepted_at timestamptz,

    created_by uuid references auth.users(id),

    created_at timestamptz default now()

);

create index if not exists
idx_company_invites_company
on company_invitations(company_id);

create index if not exists
idx_company_invites_email
on company_invitations(email);