import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

const OPERATIONS = new Set(["own_jobs","branch","selected","company"]);
const FINANCE = new Set(["none","branch","selected","company"]);

export async function PUT(request: NextRequest) {
  const moduleGate = await requireApiModule("multi_branch");
  if (moduleGate) return moduleGate;

  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = createSupabaseAdmin();
    if (!(await isCompanyFeatureEnabled(admin, user.companyId, "multi_branch"))) {
      return NextResponse.json({ error: "Multi-branch management is available on Enterprise." }, { status: 403 });
    }

    const body = await request.json();
    const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const homeBranchId = typeof body.homeBranchId === "string" ? body.homeBranchId.trim() : "";
    const operationsScope = typeof body.operationsScope === "string" ? body.operationsScope : "branch";
    const financeScope = typeof body.financeScope === "string" ? body.financeScope : "branch";
    const branchIds = Array.isArray(body.branchIds) ? Array.from(new Set(body.branchIds.filter((value: unknown) => typeof value === "string" && value.trim()).map((value: string) => value.trim()))) : [];

    if (!targetUserId || !homeBranchId || !OPERATIONS.has(operationsScope) || !FINANCE.has(financeScope)) {
      return NextResponse.json({ error: "A user, home depot and valid scopes are required." }, { status: 400 });
    }

    const { data: validBranches, error: branchError } = await admin.from("company_branches").select("id").eq("company_id", user.companyId).eq("active", true).in("id", Array.from(new Set([homeBranchId, ...branchIds])));
    if (branchError) throw new Error(branchError.message);
    const validIds = new Set((validBranches ?? []).map((row) => String(row.id)));
    if (!validIds.has(homeBranchId)) return NextResponse.json({ error: "Home depot is not valid for this company." }, { status: 400 });

    const { data: membership, error: membershipError } = await admin.from("company_members").select("user_id").eq("company_id", user.companyId).eq("user_id", targetUserId).eq("is_active", true).maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership) return NextResponse.json({ error: "That user is not an active member of this company." }, { status: 404 });

    const { error: scopeError } = await admin.from("company_member_branch_scopes").upsert({
      company_id: user.companyId,
      user_id: targetUserId,
      home_branch_id: homeBranchId,
      operations_scope: operationsScope,
      finance_scope: financeScope,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,user_id" });
    if (scopeError) throw new Error(scopeError.message);

    const { error: deleteError } = await admin.from("company_member_branch_access").delete().eq("company_id", user.companyId).eq("user_id", targetUserId);
    if (deleteError) throw new Error(deleteError.message);

    const requestedIds = Array.from(new Set([homeBranchId, ...branchIds])).filter((id) => validIds.has(id));
    if (requestedIds.length) {
      const { error: insertError } = await admin.from("company_member_branch_access").insert(requestedIds.map((branchId) => ({ company_id: user.companyId, user_id: targetUserId, branch_id: branchId })));
      if (insertError) throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update depot access." }, { status: 500 });
  }
}
