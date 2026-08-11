"use client";

import { useEffect } from "react";

import {
  applyCompanyTheme,
  DEFAULT_COMPANY_THEME,
  resetCompanyTheme,
  type CompanyTheme,
} from "@/lib/company-theme";

type ThemeResponse = {
  theme?: CompanyTheme;
};

type CompanyThemeProviderProps = {
  companyId: string | null;
};

export default function CompanyThemeProvider({
  companyId,
}: CompanyThemeProviderProps) {
  useEffect(() => {
    let active = true;

    if (!companyId) {
      resetCompanyTheme();
      return;
    }

    async function loadTheme() {
      try {
        const response = await fetch("/api/theme/current", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (active) applyCompanyTheme(DEFAULT_COMPANY_THEME);
          return;
        }

        const payload = (await response.json()) as ThemeResponse;

        if (active) {
          applyCompanyTheme(payload.theme ?? DEFAULT_COMPANY_THEME);
        }
      } catch (error) {
        console.error("Unable to load company theme:", error);
        if (active) applyCompanyTheme(DEFAULT_COMPANY_THEME);
      }
    }

    void loadTheme();

    return () => {
      active = false;
    };
  }, [companyId]);

  return null;
}
