"use client";

export type MarketingEventProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    lintrk?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export const MARKETING_CONSENT_KEY = "agricore_marketing_consent_v1";

export function hasMarketingConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MARKETING_CONSENT_KEY) === "accepted";
}

export function trackMarketingEvent(
  name: string,
  properties: MarketingEventProperties = {},
) {
  if (typeof window === "undefined" || !hasMarketingConsent()) return;

  window.gtag?.("event", name, properties);
  window.fbq?.("trackCustom", name, properties);
  window.clarity?.("event", name);

  // LinkedIn conversion IDs are created per conversion in Campaign Manager.
  // If one is supplied for a key conversion, send it here too.
  const linkedInConversionId = process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID?.trim();
  if (linkedInConversionId && window.lintrk) {
    window.lintrk("track", { conversion_id: Number(linkedInConversionId) || linkedInConversionId });
  }
}
