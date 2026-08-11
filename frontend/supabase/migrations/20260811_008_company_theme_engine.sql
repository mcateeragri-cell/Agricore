begin;

alter table public.company_settings
  add column if not exists sidebar_colour text not null default '#0B4331',
  add column if not exists sidebar_colour_secondary text not null default '#073023',
  add column if not exists sidebar_text_colour text not null default '#F4FFF9',
  add column if not exists sidebar_accent_colour text not null default '#6EE7B7',
  add column if not exists sidebar_style text not null default 'gradient';

update public.company_settings
set
  sidebar_colour = coalesce(nullif(trim(sidebar_colour), ''), '#0B4331'),
  sidebar_colour_secondary = coalesce(nullif(trim(sidebar_colour_secondary), ''), '#073023'),
  sidebar_text_colour = coalesce(nullif(trim(sidebar_text_colour), ''), '#F4FFF9'),
  sidebar_accent_colour = coalesce(nullif(trim(sidebar_accent_colour), ''), '#6EE7B7'),
  sidebar_style = case
    when sidebar_style = 'solid' then 'solid'
    else 'gradient'
  end;

alter table public.company_settings
  drop constraint if exists company_settings_sidebar_style_check;

alter table public.company_settings
  add constraint company_settings_sidebar_style_check
  check (sidebar_style in ('solid', 'gradient'));

alter table public.company_settings
  drop constraint if exists company_settings_sidebar_colour_check;

alter table public.company_settings
  add constraint company_settings_sidebar_colour_check
  check (sidebar_colour ~ '^#[0-9A-Fa-f]{6}$');

alter table public.company_settings
  drop constraint if exists company_settings_sidebar_colour_secondary_check;

alter table public.company_settings
  add constraint company_settings_sidebar_colour_secondary_check
  check (sidebar_colour_secondary ~ '^#[0-9A-Fa-f]{6}$');

alter table public.company_settings
  drop constraint if exists company_settings_sidebar_text_colour_check;

alter table public.company_settings
  add constraint company_settings_sidebar_text_colour_check
  check (sidebar_text_colour ~ '^#[0-9A-Fa-f]{6}$');

alter table public.company_settings
  drop constraint if exists company_settings_sidebar_accent_colour_check;

alter table public.company_settings
  add constraint company_settings_sidebar_accent_colour_check
  check (sidebar_accent_colour ~ '^#[0-9A-Fa-f]{6}$');

commit;
