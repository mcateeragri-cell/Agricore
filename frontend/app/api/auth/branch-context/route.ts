import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

const ACTIVE_BRANCH_COOKIE = "agricore_branch_id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json()) as { branchId?: unknown };
    const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
    if (!branchId) return NextResponse.json({ error: "branchId is required." }, { status: 400 });

    const allAllowed = branchId === "all" &&
      (context.operationsScope === "company" || context.operationsScope === "selected");

    if (!allAllowed && !context.accessibleOperationalBranchIds.includes(branchId)) {
      return NextResponse.json({ error: "You do not have operational access to that depot." }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_BRANCH_COOKIE, branchId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ activeBranchId: branchId === "all" ? null : branchId });
  } catch (error) {
    console.error("Unable to switch AgriCore depot:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to switch depot." },
      { status: 500 },
    );
  }
}
