import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

const ACTIVE_FINANCE_BRANCH_COOKIE = "agricore_finance_branch_id";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (context.financeScope === "none") return NextResponse.json({ error: "You do not have financial access." }, { status: 403 });
    const body = (await request.json()) as { branchId?: unknown };
    const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
    if (!branchId) return NextResponse.json({ error: "branchId is required." }, { status: 400 });
    const allAllowed = branchId === "all" && (context.financeScope === "company" || context.financeScope === "selected");
    if (!allAllowed && !context.accessibleFinanceBranchIds.includes(branchId)) {
      return NextResponse.json({ error: "You do not have financial access to that depot." }, { status: 403 });
    }
    const store = await cookies();
    store.set(ACTIVE_FINANCE_BRANCH_COOKIE, branchId, { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", path:"/", maxAge:60*60*24*365 });
    return NextResponse.json({ activeFinanceBranchId: branchId === "all" ? null : branchId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to switch finance depot." }, { status: 500 });
  }
}
