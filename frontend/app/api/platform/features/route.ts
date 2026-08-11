import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(request: NextRequest) {
  const value = request.headers.get("authorization") ?? "";
  const [scheme, token] = value.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function authorise(request: NextRequest) {
  const admin = createSupabaseAdmin();
  const token = bearer(request);
  if (!token) return { admin, error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { admin, error: NextResponse.json({ error: "Your session has expired." }, { status: 401 }) };

  const { data: role, error: roleError } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) return { admin, error: NextResponse.json({ error: roleError.message }, { status: 500 }) };
  if (!role || !["super_admin", "platform_admin"].includes(role.role)) {
    return { admin, error: NextResponse.json({ error: "Platform administrator access required." }, { status: 403 }) };
  }
  return { admin, error: null };
}

export async function GET(request: NextRequest) {
  const auth = await authorise(request);
  if (auth.error) return auth.error;

  const [features, companies, overrides] = await Promise.all([
    auth.admin.from("platform_features").select("feature_key, feature_name, description, default_enabled").order("feature_name"),
    auth.admin.from("companies").select("id, company_name, is_active").order("company_name"),
    auth.admin.from("company_features").select("company_id, feature_key, enabled"),
  ]);

  const firstError = features.error || companies.error || overrides.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({ features: features.data ?? [], companies: companies.data ?? [], overrides: overrides.data ?? [] });
}

type Body = { companyId?: unknown; featureKey?: unknown; enabled?: unknown };

export async function POST(request: NextRequest) {
  const auth = await authorise(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Body;
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const featureKey = typeof body.featureKey === "string" ? body.featureKey : "";
  if (!companyId || !featureKey || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Company, feature and enabled state are required." }, { status: 400 });
  }

  const { error } = await auth.admin.from("company_features").upsert({
    company_id: companyId,
    feature_key: featureKey,
    enabled: body.enabled,
  }, { onConflict: "company_id,feature_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
