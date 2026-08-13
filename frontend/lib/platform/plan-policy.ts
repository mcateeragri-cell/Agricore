export const AGRICORE_PLAN_ORDER = ["starter", "professional", "enterprise"] as const;

export type AgriCorePlanSlug = (typeof AGRICORE_PLAN_ORDER)[number];

export const AGRICORE_PLAN_POLICY: Record<
  AgriCorePlanSlug,
  {
    name: string;
    monthlyPriceGbp: number;
    aiDiagnosticsPerMonth: number;
    maxUsers: number | null;
    summary: string;
  }
> = {
  starter: {
    name: "Starter",
    monthlyPriceGbp: 49,
    aiDiagnosticsPerMonth: 50,
    maxUsers: 2,
    summary: "Core customer, machine, job, quote, invoice and service workflows for small teams.",
  },
  professional: {
    name: "Professional",
    monthlyPriceGbp: 89,
    aiDiagnosticsPerMonth: 1000,
    maxUsers: null,
    summary: "The complete day-to-day AgriCore operating workflow for growing engineering businesses.",
  },
  enterprise: {
    name: "Enterprise",
    monthlyPriceGbp: 225,
    aiDiagnosticsPerMonth: 5000,
    maxUsers: null,
    summary: "Professional plus Financial Control, enterprise capabilities, API access and priority support.",
  },
};

export function isAgriCorePlanSlug(value: unknown): value is AgriCorePlanSlug {
  return typeof value === "string" && AGRICORE_PLAN_ORDER.includes(value as AgriCorePlanSlug);
}

export function planPolicy(slug: unknown) {
  return isAgriCorePlanSlug(slug) ? AGRICORE_PLAN_POLICY[slug] : AGRICORE_PLAN_POLICY.professional;
}

export function nextPlanSlug(slug: unknown): AgriCorePlanSlug | null {
  if (!isAgriCorePlanSlug(slug)) return null;
  const index = AGRICORE_PLAN_ORDER.indexOf(slug);
  return AGRICORE_PLAN_ORDER[index + 1] ?? null;
}
