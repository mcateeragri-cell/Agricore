export type CompanySettings = {
  id: number;
  company_name: string;
  contact_line: string;
  address_line_1: string | null;
  address_line_2: string | null;
  town_city: string | null;
  county: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_number: string | null;
  company_registration: string | null;
  logo_path: string | null;
  primary_colour: string;
  secondary_colour: string;
  invoice_footer: string | null;
  payment_terms_days: number;
  bank_name: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  country_code: string;
  currency_code: string;
  locale: string;
  timezone: string;
  tax_name: string;
  default_tax_rate: number;
  date_format: string;
  time_format: "12" | "24";
  week_start: "monday" | "sunday" | "saturday";
  measurement_system: "metric" | "imperial";
  updated_at: string;
};

export type CompanySettingsUpdate = Omit<
  CompanySettings,
  "id" | "logo_path" | "updated_at"
>;