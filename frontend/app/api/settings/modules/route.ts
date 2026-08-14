import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { AGRICORE_MODULES, MODULE_BY_KEY, dependentModuleKeys } from "@/lib/modules/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canManage(context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    context.platformRole === "super_admin" ||
    context.platformRole === "platform_admin" ||
    context.role === "company_admin" ||
    context.role === "administrator" ||
    context.permissions.includes("settings.manage")
  );
}

async function loadState(companyId: string) {
  const admin = createSupabaseAdmin();
  const [company, subscription, features, overrides] = await Promise.all([
    admin.from("companies").select("billing_mode").eq("id", companyId).single(),
    admin.from("company_subscriptions").select("plan_id,status,created_at,subscription_plans(slug,name)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("platform_features").select("feature_key,feature_name,description,default_enabled"),
    admin.from("company_features").select("feature_key,enabled").eq("company_id", companyId),
  ]);

  const firstError = company.error || subscription.error || features.error || overrides.error;
  if (firstError) throw new Error(firstError.message);

  const billingMode = String(company.data?.billing_mode ?? "subscription");
  const platform = new Map((features.data ?? []).map((row) => [String(row.feature_key), row]));
  const overrideMap = new Map((overrides.data ?? []).map((row) => [String(row.feature_key), Boolean(row.enabled)]));
  const entitlementMap = new Map<string, boolean>();

  if (billingMode === "internal" || billingMode === "demo") {
    for (const module of AGRICORE_MODULES) entitlementMap.set(module.key, platform.has(module.key));
  } else if (subscription.data?.plan_id) {
    const { data, error } = await admin.from("subscription_plan_features").select("feature_key,enabled").eq("plan_id", subscription.data.plan_id);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) entitlementMap.set(String(row.feature_key), Boolean(row.enabled));
  }

  const modules = AGRICORE_MODULES.map((module) => {
    const entitled = entitlementMap.get(module.key) === true;
    const explicit = overrideMap.get(module.key);
    const enabled = module.locked ? entitled : entitled && explicit !== false;
    return { ...module, entitled, enabled, explicitOverride: explicit ?? null };
  });

  const planRelation = subscription.data?.subscription_plans as { slug?: string; name?: string } | { slug?: string; name?: string }[] | null | undefined;
  const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;

  return {
    billingMode,
    plan: plan?.name ?? plan?.slug ?? (billingMode === "internal" ? "Internal" : billingMode === "demo" ? "Demo" : "No active plan"),
    modules,
  };
}

export async function GET() {
  try {
    const context = await getAuthenticatedUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!canManage(context)) return NextResponse.json({ error: "Company settings access required." }, { status: 403 });
    return NextResponse.json(await loadState(context.companyId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load modules." }, { status: 500 });
  }
}

type ToggleBody = { featureKey?: unknown; enabled?: unknown };

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!canManage(context)) return NextResponse.json({ error: "Company settings access required." }, { status: 403 });

    const body = (await request.json()) as ToggleBody;
    const featureKey = typeof body.featureKey === "string" ? body.featureKey.trim() : "";
    const requested = body.enabled;
    const module = MODULE_BY_KEY.get(featureKey);
    if (!module || typeof requested !== "boolean") return NextResponse.json({ error: "A valid module and enabled state are required." }, { status: 400 });
    if (module.locked) return NextResponse.json({ error: `${module.name} is part of the AgriCore core and cannot be disabled.` }, { status: 400 });

    const state = await loadState(context.companyId);
    const current = state.modules.find((item) => item.key === featureKey);
    if (!current?.entitled && requested) return NextResponse.json({ error: `${module.name} is not included in the current subscription plan.` }, { status: 403 });

    if (!requested) {
      const enabledKeys = state.modules.filter((item) => item.enabled).map((item) => item.key);
      const dependents = dependentModuleKeys(featureKey, enabledKeys);
      if (dependents.length) {
        const names = dependents.map((key) => MODULE_BY_KEY.get(key)?.name ?? key).join(", ");
        return NextResponse.json({ error: `Disable ${names} first because ${names} depends on ${module.name}.` }, { status: 409 });
      }
    }

    if (requested) {
      const missing = (module.dependencies ?? []).filter((key) => !state.modules.find((item) => item.key === key)?.enabled);
      if (missing.length) {
        const names = missing.map((key) => MODULE_BY_KEY.get(key)?.name ?? key).join(", ");
        return NextResponse.json({ error: `Enable ${names} before enabling ${module.name}.` }, { status: 409 });
      }
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin.from("company_features").upsert({ company_id: context.companyId, feature_key: featureKey, enabled: requested }, { onConflict: "company_id,feature_key" });
    if (error) throw new Error(error.message);

    return NextResponse.json(await loadState(context.companyId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update module." }, { status: 500 });
  }
}
