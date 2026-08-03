"use client";

export type ActiveCompany = { id: string; name: string; slug: string };

type CompanyContextResponse = { activeCompany?: ActiveCompany | null; error?: string };

export async function getActiveCompany(): Promise<ActiveCompany> {
  const response = await fetch("/api/auth/company-context", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  const result = (await response.json()) as CompanyContextResponse;
  if (!response.ok) throw new Error(result.error || "Unable to load the active company.");
  if (!result.activeCompany?.id) throw new Error("No active company is available for this account.");
  return result.activeCompany;
}
