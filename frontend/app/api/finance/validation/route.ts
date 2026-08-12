import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";
import { loadFinanceValidation, refreshFinanceValidation } from "@/lib/platform/finance";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth) && !auth.permissions.includes("finance.view")) return NextResponse.json({ error: "Finance permission is required." }, { status: 403 });
  const admin = createSupabaseAdmin();
  await refreshFinanceValidation(admin, auth.companyId);
  const issues = await loadFinanceValidation(admin, auth.companyId);
  return NextResponse.json({ issues }, { headers: { "Cache-Control": "no-store" } });
}
