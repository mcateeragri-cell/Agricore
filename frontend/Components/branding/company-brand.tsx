"use client";

import { useEffect, useState } from "react";

import AgriCoreMark from "./agricore-mark";

type CompanyResponse = {
  settings?: {
    company_name?: string;
    contact_line?: string;
  };
  logoUrl?: string | null;
};

type CompanyBrandProps = {
  compact?: boolean;
  dark?: boolean;
  className?: string;
};

export default function CompanyBrand({
  compact = false,
  dark = false,
  className = "",
}: CompanyBrandProps) {
  const [companyName, setCompanyName] = useState("Your company");
  const [contactLine, setContactLine] = useState(
    "Agricultural Engineering & Field Service"
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBrand() {
      try {
        const response = await fetch("/api/settings/company", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as CompanyResponse;
        if (!active) return;

        setCompanyName(
          data.settings?.company_name || "Your company"
        );
        setContactLine(
          data.settings?.contact_line ||
            "Agricultural Engineering & Field Service"
        );
        setLogoUrl(data.logoUrl ?? null);
      } catch (error) {
        console.error("Unable to load company branding:", error);
      }
    }

    void loadBrand();
    return () => {
      active = false;
    };
  }, []);

  const mainText = dark ? "text-white" : "text-slate-900";
  const mutedText = dark ? "text-emerald-100" : "text-slate-500";

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className={
            compact
              ? "h-11 w-14 shrink-0 object-contain"
              : "h-16 w-24 shrink-0 object-contain"
          }
        />
      ) : (
        <AgriCoreMark size={compact ? 46 : 66} />
      )}

      <div className="min-w-0">
        <p
          className={`truncate font-bold tracking-tight ${mainText} ${
            compact ? "text-sm" : "text-lg"
          }`}
        >
          AgriCore
        </p>
        <p
          className={`truncate font-semibold ${mainText} ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {companyName}
        </p>
        {!compact && (
          <p className={`truncate text-xs ${mutedText}`}>{contactLine}</p>
        )}
      </div>
    </div>
  );
}
