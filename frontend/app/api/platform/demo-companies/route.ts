import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  clearDemoCompanyData,
  createDemoCompany,
  deleteDemoCompany,
  DEMO_MAX_WORKSPACES,
  DEMO_PROFILES,
  DEMO_SLUG_PREFIX,
  refreshDemoCompanyIdentity,
  seedDemoCompanyData,
  type DemoProfileKey,
} from "@/lib/platform/demo-company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function platformUser() {
  const user = await getAuthenticatedUserContext();
  if (!user) return { error: NextResponse.json({ error: "You must be signed in." }, { status: 401 }) } as const;
  if (user.platformRole !== "super_admin" && user.platformRole !== "platform_admin") {
    return { error: NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 }) } as const;
  }
  return { user } as const;
}

function isProfile(value: unknown): value is DemoProfileKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DEMO_PROFILES, value);
}

async function loadDemoCompanies(admin: ReturnType<typeof createSupabaseAdmin>) {
  const { data, error } = await admin
    .from("companies")
    .select("id,company_name,slug,created_at,is_active,business_type")
    .like("slug", `${DEMO_SLUG_PREFIX}%`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET() {
  const auth = await platformUser();
  if ("error" in auth) return auth.error;
  const admin = createSupabaseAdmin();
  try {
    const companies = await loadDemoCompanies(admin);
    return NextResponse.json({
      companies,
      maxWorkspaces: DEMO_MAX_WORKSPACES,
      profiles: Object.entries(DEMO_PROFILES).map(([key, value]) => ({ key, label: value.label, description: value.description })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load demo companies." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await platformUser();
  if ("error" in auth) return auth.error;
  const admin = createSupabaseAdmin();
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    companyId?: string;
    companyName?: string;
    profile?: string;
  };
  const action = String(body.action ?? "create");
  const profile: DemoProfileKey = isProfile(body.profile) ? body.profile : "medium";

  try {
    if (action === "create") {
      const existing = await loadDemoCompanies(admin);
      if (existing.length >= DEMO_MAX_WORKSPACES) {
        return NextResponse.json({ error: `Demo workspace limit reached (${DEMO_MAX_WORKSPACES}). Delete an old demo before creating another.` }, { status: 409 });
      }
      const result = await createDemoCompany(
        admin,
        { userId: auth.user.userId, fullName: auth.user.fullName, email: auth.user.email },
        String(body.companyName ?? "").trim() || undefined,
        profile,
      );
      return NextResponse.json({ success: true, ...result }, { status: 201 });
    }

    const companyId = String(body.companyId ?? "").trim();
    if (!companyId) return NextResponse.json({ error: "Select a demo company." }, { status: 400 });
    const { data: company, error: companyError } = await admin.from("companies").select("id,slug,company_name,business_type").eq("id", companyId).maybeSingle();
    if (companyError) throw new Error(companyError.message);
    if (!company || !company.slug.startsWith(DEMO_SLUG_PREFIX)) return NextResponse.json({ error: "Only demo companies can be changed here." }, { status: 400 });

    if (action === "reset") {
      await clearDemoCompanyData(admin, company.id);
      const identity = await refreshDemoCompanyIdentity(admin, company.id);
      const counts = await seedDemoCompanyData(admin, company.id, profile);
      return NextResponse.json({ success: true, company: { ...company, company_name: identity.name }, counts });
    }

    if (action === "duplicate") {
      const existing = await loadDemoCompanies(admin);
      if (existing.length >= DEMO_MAX_WORKSPACES) {
        return NextResponse.json({ error: `Demo workspace limit reached (${DEMO_MAX_WORKSPACES}). Delete an old demo before duplicating.` }, { status: 409 });
      }
      const result = await createDemoCompany(
        admin,
        { userId: auth.user.userId, fullName: auth.user.fullName, email: auth.user.email },
        undefined,
        profile,
      );
      return NextResponse.json({ success: true, ...result }, { status: 201 });
    }

    if (action === "delete") {
      await deleteDemoCompany(admin, company.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown demo company action." }, { status: 400 });
  } catch (error) {
    console.error("Demo company operation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to manage the demo company." }, { status: 500 });
  }
}
