import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingMode = "subscription" | "internal" | "demo";

export async function loadEffectiveFeatures(
  admin: SupabaseClient,
  companyId: string,
) {
  const [companyResult, featuresResult, overrideResult, subscriptionResult] =
    await Promise.all([
      admin
        .from("companies")
        .select("billing_mode")
        .eq("id", companyId)
        .maybeSingle(),
      admin
        .from("platform_features")
        .select("feature_key,default_enabled"),
      admin
        .from("company_features")
        .select("feature_key,enabled")
        .eq("company_id", companyId),
      admin
        .from("company_subscriptions")
        .select("plan_id,status,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const firstError =
    companyResult.error ||
    featuresResult.error ||
    overrideResult.error ||
    subscriptionResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const billingMode = String(
    companyResult.data?.billing_mode ?? "subscription",
  ) as BillingMode;

  const platformFeatures = featuresResult.data ?? [];
  const enabled = new Map<string, boolean>(
    platformFeatures.map((feature) => [
      String(feature.feature_key),
      Boolean(feature.default_enabled),
    ]),
  );

  const planEntitlements = new Map<string, boolean>();

  if (billingMode === "internal" || billingMode === "demo") {
    for (const feature of platformFeatures) {
      enabled.set(String(feature.feature_key), true);
    }
  } else if (subscriptionResult.data?.plan_id) {
    const { data: planFeatures, error: planError } = await admin
      .from("subscription_plan_features")
      .select("feature_key,enabled")
      .eq("plan_id", subscriptionResult.data.plan_id);

    if (planError) {
      throw new Error(planError.message);
    }

    // Subscription plans are an allow-list. Start with every registered feature
    // disabled, then apply the plan matrix. This makes newly introduced platform
    // features fail closed until a migration explicitly assigns them to a plan.
    for (const feature of platformFeatures) {
      enabled.set(String(feature.feature_key), false);
    }

    for (const row of planFeatures ?? []) {
      const key = String(row.feature_key);
      const value = Boolean(row.enabled);
      planEntitlements.set(key, value);
      enabled.set(key, value);
    }
  }

  if (billingMode === "subscription") {
    for (const row of overrideResult.data ?? []) {
      const key = String(row.feature_key);
      const requested = Boolean(row.enabled);

      // The subscription plan is the entitlement ceiling. A company override may
      // switch an entitled feature off, but it must never unlock a feature the
      // current plan explicitly disables. This prevents legacy/default company
      // feature rows from accidentally giving Starter or Professional customers
      // higher-tier capabilities.
      if (planEntitlements.has(key)) {
        enabled.set(key, requested && planEntitlements.get(key) === true);
      } else if (!requested) {
        // Features that pre-date the plan matrix may still be disabled safely.
        // They are not elevated by an override until they are explicitly mapped
        // into subscription_plan_features.
        enabled.set(key, false);
      }
    }
  }

  return {
    billingMode,
    enabledFeatures: Array.from(enabled.entries())
      .filter(([, isEnabled]) => isEnabled)
      .map(([featureKey]) => featureKey),
  };
}

export async function isCompanyFeatureEnabled(
  admin: SupabaseClient,
  companyId: string,
  featureKey: string,
) {
  const result = await loadEffectiveFeatures(admin, companyId);
  return result.enabledFeatures.includes(featureKey);
}
