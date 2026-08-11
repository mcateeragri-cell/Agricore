begin;

alter table public.company_settings
  add column if not exists country_code text not null default 'GB',
  add column if not exists currency_code text not null default 'GBP',
  add column if not exists locale text not null default 'en-GB',
  add column if not exists timezone text not null default 'Europe/London',
  add column if not exists tax_name text not null default 'VAT',
  add column if not exists default_tax_rate numeric(6,3) not null default 20,
  add column if not exists date_format text not null default 'DD/MM/YYYY',
  add column if not exists time_format text not null default '24',
  add column if not exists week_start text not null default 'monday',
  add column if not exists measurement_system text not null default 'metric';

update public.company_settings
set
  country_code = coalesce(nullif(country_code, ''), 'GB'),
  currency_code = coalesce(nullif(currency_code, ''), 'GBP'),
  locale = coalesce(nullif(locale, ''), 'en-GB'),
  timezone = coalesce(nullif(timezone, ''), 'Europe/London'),
  tax_name = coalesce(nullif(tax_name, ''), 'VAT'),
  default_tax_rate = coalesce(default_tax_rate, 20),
  date_format = coalesce(nullif(date_format, ''), 'DD/MM/YYYY'),
  time_format = coalesce(nullif(time_format, ''), '24'),
  week_start = coalesce(nullif(week_start, ''), 'monday'),
  measurement_system = coalesce(nullif(measurement_system, ''), 'metric');

alter table public.company_settings
  drop constraint if exists company_settings_country_code_check,
  drop constraint if exists company_settings_currency_code_check,
  drop constraint if exists company_settings_time_format_check,
  drop constraint if exists company_settings_week_start_check,
  drop constraint if exists company_settings_measurement_system_check,
  drop constraint if exists company_settings_default_tax_rate_check;

alter table public.company_settings
  add constraint company_settings_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  add constraint company_settings_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$'),
  add constraint company_settings_time_format_check
    check (time_format in ('12','24')),
  add constraint company_settings_week_start_check
    check (week_start in ('monday','sunday','saturday')),
  add constraint company_settings_measurement_system_check
    check (measurement_system in ('metric','imperial')),
  add constraint company_settings_default_tax_rate_check
    check (default_tax_rate >= 0 and default_tax_rate <= 100);

comment on column public.company_settings.country_code is 'ISO 3166-1 alpha-2 company country code. UK/GB is the AgriCore default.';
comment on column public.company_settings.currency_code is 'ISO 4217 base currency used by the company.';
comment on column public.company_settings.locale is 'BCP 47 locale used for number/date presentation.';
comment on column public.company_settings.timezone is 'IANA time zone for company-local scheduling and display.';
comment on column public.company_settings.tax_name is 'Company tax label such as VAT, GST or Sales Tax.';
comment on column public.company_settings.default_tax_rate is 'Default percentage tax rate; individual document rates may override it.';

commit;
