"use client";

import { useCallback } from "react";

import { useCompanyRegionalSettings } from "@/lib/client/use-company-regional-settings";
import {
  currencySymbol,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/regional-settings";

export function useRegionalFormatters() {
  const { regionalSettings, loading } = useCompanyRegionalSettings();

  const money = useCallback(
    (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) =>
      formatCurrency(Number(value ?? 0), regionalSettings, options),
    [regionalSettings],
  );

  const number = useCallback(
    (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) =>
      formatNumber(Number(value ?? 0), regionalSettings, options),
    [regionalSettings],
  );

  const date = useCallback(
    (value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) =>
      value ? formatDate(value, regionalSettings, options) : "—",
    [regionalSettings],
  );

  const dateTime = useCallback(
    (value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) =>
      value ? formatDateTime(value, regionalSettings, options) : "—",
    [regionalSettings],
  );

  return {
    regionalSettings,
    loading,
    money,
    number,
    date,
    dateTime,
    taxName: regionalSettings.tax_name,
    taxRate: regionalSettings.default_tax_rate,
    currencyCode: regionalSettings.currency_code,
    currencySymbol: currencySymbol(regionalSettings),
  };
}
