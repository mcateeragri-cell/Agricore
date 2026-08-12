export type MeasurementSystem = "metric" | "imperial";
export type TimeFormat = "24" | "12";
export type WeekStart = "monday" | "sunday" | "saturday";

export type RegionalSettings = {
  country_code: string;
  currency_code: string;
  locale: string;
  timezone: string;
  tax_name: string;
  default_tax_rate: number;
  date_format: string;
  time_format: TimeFormat;
  week_start: WeekStart;
  measurement_system: MeasurementSystem;
};

export type CountryProfile = RegionalSettings & {
  name: string;
};

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  GB: {
    name: "United Kingdom",
    country_code: "GB",
    currency_code: "GBP",
    locale: "en-GB",
    timezone: "Europe/London",
    tax_name: "VAT",
    default_tax_rate: 20,
    date_format: "DD/MM/YYYY",
    time_format: "24",
    week_start: "monday",
    measurement_system: "metric",
  },
  IE: {
    name: "Ireland",
    country_code: "IE",
    currency_code: "EUR",
    locale: "en-IE",
    timezone: "Europe/Dublin",
    tax_name: "VAT",
    default_tax_rate: 23,
    date_format: "DD/MM/YYYY",
    time_format: "24",
    week_start: "monday",
    measurement_system: "metric",
  },
  US: {
    name: "United States",
    country_code: "US",
    currency_code: "USD",
    locale: "en-US",
    timezone: "America/Chicago",
    tax_name: "Sales Tax",
    default_tax_rate: 0,
    date_format: "MM/DD/YYYY",
    time_format: "12",
    week_start: "sunday",
    measurement_system: "imperial",
  },
  CA: {
    name: "Canada",
    country_code: "CA",
    currency_code: "CAD",
    locale: "en-CA",
    timezone: "America/Toronto",
    tax_name: "GST/HST",
    default_tax_rate: 5,
    date_format: "YYYY-MM-DD",
    time_format: "12",
    week_start: "sunday",
    measurement_system: "metric",
  },
  AU: {
    name: "Australia",
    country_code: "AU",
    currency_code: "AUD",
    locale: "en-AU",
    timezone: "Australia/Sydney",
    tax_name: "GST",
    default_tax_rate: 10,
    date_format: "DD/MM/YYYY",
    time_format: "24",
    week_start: "monday",
    measurement_system: "metric",
  },
  NZ: {
    name: "New Zealand",
    country_code: "NZ",
    currency_code: "NZD",
    locale: "en-NZ",
    timezone: "Pacific/Auckland",
    tax_name: "GST",
    default_tax_rate: 15,
    date_format: "DD/MM/YYYY",
    time_format: "24",
    week_start: "monday",
    measurement_system: "metric",
  },
  ZA: {
    name: "South Africa",
    country_code: "ZA",
    currency_code: "ZAR",
    locale: "en-ZA",
    timezone: "Africa/Johannesburg",
    tax_name: "VAT",
    default_tax_rate: 15,
    date_format: "YYYY/MM/DD",
    time_format: "24",
    week_start: "monday",
    measurement_system: "metric",
  },
};

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  ...COUNTRY_PROFILES.GB,
};

type PartialRegional = Partial<RegionalSettings> | null | undefined;

export function normaliseRegionalSettings(input: PartialRegional): RegionalSettings {
  const country = String(input?.country_code ?? "GB").toUpperCase();
  const profile = COUNTRY_PROFILES[country] ?? COUNTRY_PROFILES.GB;
  const taxRate = Number(input?.default_tax_rate ?? profile.default_tax_rate);

  return {
    country_code: country,
    currency_code: String(input?.currency_code ?? profile.currency_code).toUpperCase(),
    locale: String(input?.locale ?? profile.locale),
    timezone: String(input?.timezone ?? profile.timezone),
    tax_name: String(input?.tax_name ?? profile.tax_name),
    default_tax_rate: Number.isFinite(taxRate) ? taxRate : profile.default_tax_rate,
    date_format: String(input?.date_format ?? profile.date_format),
    time_format: input?.time_format === "12" ? "12" : "24",
    week_start:
      input?.week_start === "sunday" || input?.week_start === "saturday"
        ? input.week_start
        : "monday",
    measurement_system: input?.measurement_system === "imperial" ? "imperial" : "metric",
  };
}

export function formatCurrency(
  value: number,
  regional?: PartialRegional,
  options?: Intl.NumberFormatOptions,
) {
  const settings = normaliseRegionalSettings(regional);
  return new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency_code,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number, regional?: PartialRegional, options?: Intl.NumberFormatOptions) {
  const settings = normaliseRegionalSettings(regional);
  return new Intl.NumberFormat(settings.locale, options).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(
  value: Date | string | number,
  regional?: PartialRegional,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
) {
  const settings = normaliseRegionalSettings(regional);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(settings.locale, {
    timeZone: settings.timezone,
    ...options,
  }).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  regional?: PartialRegional,
  options?: Intl.DateTimeFormatOptions,
) {
  const settings = normaliseRegionalSettings(regional);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(settings.locale, {
    timeZone: settings.timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: settings.time_format === "12",
    ...options,
  }).format(date);
}

export function currencySymbol(regional?: PartialRegional) {
  const settings = normaliseRegionalSettings(regional);
  const parts = new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency_code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? settings.currency_code;
}

export function distanceUnit(regional?: PartialRegional) {
  return normaliseRegionalSettings(regional).measurement_system === "imperial" ? "mi" : "km";
}

export function temperatureUnit(regional?: PartialRegional) {
  return normaliseRegionalSettings(regional).measurement_system === "imperial" ? "°F" : "°C";
}
