"use client";

import { useEffect, useState } from "react";
import { DEFAULT_REGIONAL_SETTINGS, normaliseRegionalSettings, type RegionalSettings } from "@/lib/regional-settings";

export function useCompanyRegionalSettings() {
  const [settings, setSettings] = useState<RegionalSettings>(DEFAULT_REGIONAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/regional", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { settings?: Partial<RegionalSettings> };
      })
      .then((payload) => {
        if (active && payload?.settings) setSettings(normaliseRegionalSettings(payload.settings));
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { regionalSettings: settings, loading };
}
