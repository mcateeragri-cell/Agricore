import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { syncEnterpriseBranchBilling } from "@/lib/platform/branch-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 250) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function requireMultiBranch(companyId: string) {
  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, companyId, "multi_branch");
  if (!enabled) throw new Error("Multi-branch management is available on Enterprise.");
  return admin;
}

export async function GET() {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = await requireMultiBranch(user.companyId);
    const [{ data: branches, error: branchError }, { data: profiles, error: profileError }, { data: roles, error: roleError }, { data: scopes, error: scopeError }, { data: access, error: accessError }] = await Promise.all([
      admin.from("company_branches").select("*").eq("company_id", user.companyId).order("is_head_office", { ascending: false }).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      admin.from("company_member_profiles").select("user_id,full_name,is_active").eq("company_id", user.companyId).eq("is_active", true),
      admin.from("company_member_roles").select("user_id,role").eq("company_id", user.companyId),
      admin.from("company_member_branch_scopes").select("user_id,home_branch_id,operations_scope,finance_scope").eq("company_id", user.companyId),
      admin.from("company_member_branch_access").select("user_id,branch_id").eq("company_id", user.companyId),
    ]);
    const firstError = branchError || profileError || roleError || scopeError || accessError;
    if (firstError) throw new Error(firstError.message);

    const roleMap = new Map((roles ?? []).map((row) => [String(row.user_id), String(row.role ?? "")]));
    const scopeMap = new Map((scopes ?? []).map((row) => [String(row.user_id), row]));
    const accessMap = new Map<string, string[]>();
    for (const row of access ?? []) {
      const key = String(row.user_id);
      accessMap.set(key, [...(accessMap.get(key) ?? []), String(row.branch_id)]);
    }

    const members = (profiles ?? []).map((profile) => {
      const userId = String(profile.user_id);
      const scope = scopeMap.get(userId);
      return {
        userId,
        fullName: String(profile.full_name ?? "AgriCore User"),
        role: roleMap.get(userId) ?? "",
        homeBranchId: scope?.home_branch_id ?? null,
        operationsScope: scope?.operations_scope ?? "branch",
        financeScope: scope?.finance_scope ?? "branch",
        branchIds: accessMap.get(userId) ?? [],
      };
    });

    return NextResponse.json({ branches: branches ?? [], members });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load depots." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = await requireMultiBranch(user.companyId);
    const body = await request.json();
    const name = cleanText(body.name, 120);
    const code = cleanText(body.code, 32).toUpperCase().replace(/[^A-Z0-9_-]+/g, "-");
    if (!name || !code) return NextResponse.json({ error: "Depot name and code are required." }, { status: 400 });

    const { data, error } = await admin.from("company_branches").insert({
      company_id: user.companyId,
      name,
      code,
      branch_type: ["depot","workshop","parts"].includes(body.branchType) ? body.branchType : "depot",
      address: cleanText(body.address, 1000) || null,
      phone: cleanText(body.phone, 80) || null,
      email: cleanText(body.email, 320).toLowerCase() || null,
      active: true,
    }).select("*").single();
    if (error) throw new Error(error.message);
    try {
      await syncEnterpriseBranchBilling(user.companyId);
    } catch (billingError) {
      await admin.from("company_branches").delete().eq("company_id", user.companyId).eq("id", data.id).eq("is_head_office", false);
      throw billingError;
    }
    return NextResponse.json({ branch: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create depot." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = await requireMultiBranch(user.companyId);
    const body = await request.json();
    const branchId = cleanText(body.branchId, 80);
    if (!branchId) return NextResponse.json({ error: "branchId is required." }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string" && cleanText(body.name, 120)) updates.name = cleanText(body.name, 120);
    if (typeof body.address === "string") updates.address = cleanText(body.address, 1000) || null;
    if (typeof body.phone === "string") updates.phone = cleanText(body.phone, 80) || null;
    if (typeof body.email === "string") updates.email = cleanText(body.email, 320).toLowerCase() || null;
    if (typeof body.managerUserId === "string") {
      const managerUserId = cleanText(body.managerUserId, 80);
      if (managerUserId) {
        const { data: managerMember, error: managerError } = await admin
          .from("company_members")
          .select("user_id")
          .eq("company_id", user.companyId)
          .eq("user_id", managerUserId)
          .eq("is_active", true)
          .maybeSingle();
        if (managerError) throw new Error(managerError.message);
        if (!managerMember) return NextResponse.json({ error: "Depot manager must be an active company user." }, { status: 400 });
        updates.manager_user_id = managerUserId;
      } else {
        updates.manager_user_id = null;
      }
    }
    if (typeof body.active === "boolean") updates.active = body.active;

    const { data: previous, error: previousError } = await admin.from("company_branches").select("id,active,is_head_office").eq("company_id", user.companyId).eq("id", branchId).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    if (!previous) return NextResponse.json({ error: "Depot was not found." }, { status: 404 });
    if (previous.is_head_office && body.active === false) return NextResponse.json({ error: "The head-office depot cannot be deactivated." }, { status: 400 });

    const { data, error } = await admin.from("company_branches").update(updates).eq("company_id", user.companyId).eq("id", branchId).select("*").single();
    if (error) throw new Error(error.message);
    try {
      await syncEnterpriseBranchBilling(user.companyId);
    } catch (billingError) {
      if (typeof body.active === "boolean" && body.active !== previous.active) {
        await admin.from("company_branches").update({ active: previous.active, updated_at: new Date().toISOString() }).eq("company_id", user.companyId).eq("id", branchId);
      }
      throw billingError;
    }
    return NextResponse.json({ branch: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update depot." }, { status: 500 });
  }
}
