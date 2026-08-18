import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageWebsiteIntegrations } from "@/lib/website-enquiries/access";
import { cleanWebsiteText } from "@/lib/website-enquiries/normalise";
import { createWebsiteIntegrationToken } from "@/lib/website-enquiries/token";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canManageWebsiteIntegrations(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createSupabaseAdmin();
    const [{ data: integrations, error }, { data: branches, error: branchesError }] = await Promise.all([
      admin
        .from("company_website_integrations")
        .select("id,name,key_prefix,default_branch_id,active,last_used_at,created_at,company_branches(id,name,code)")
        .eq("company_id", auth.companyId)
        .order("created_at", { ascending: false }),
      admin
        .from("company_branches")
        .select("id,name,code,is_head_office")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .order("is_head_office", { ascending: false })
        .order("sort_order", { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    if (branchesError) throw new Error(branchesError.message);
    return NextResponse.json({ integrations: integrations ?? [], branches: branches ?? [] });
  } catch (error) {
    console.error("Unable to load website integrations:", error);
    return NextResponse.json({ error: "Unable to load website integrations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canManageWebsiteIntegrations(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json() as { name?: unknown; defaultBranchId?: unknown };
    const name = cleanWebsiteText(body.name, 120);
    const defaultBranchId = cleanWebsiteText(body.defaultBranchId, 80) || null;
    if (!name) return NextResponse.json({ error: "Integration name is required." }, { status: 400 });

    const admin = createSupabaseAdmin();
    if (defaultBranchId) {
      const { data: branch, error: branchError } = await admin
        .from("company_branches")
        .select("id")
        .eq("company_id", auth.companyId)
        .eq("id", defaultBranchId)
        .eq("active", true)
        .maybeSingle();
      if (branchError) throw new Error(branchError.message);
      if (!branch) return NextResponse.json({ error: "Selected branch is not available." }, { status: 400 });
    }

    const credential = createWebsiteIntegrationToken();
    const { data, error } = await admin
      .from("company_website_integrations")
      .insert({
        company_id: auth.companyId,
        name,
        key_prefix: credential.keyPrefix,
        secret_hash: credential.secretHash,
        default_branch_id: defaultBranchId,
        active: true,
        created_by: auth.userId,
      })
      .select("id,name,key_prefix,default_branch_id,active,created_at")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ integration: data, token: credential.token }, { status: 201 });
  } catch (error) {
    console.error("Unable to create website integration:", error);
    return NextResponse.json({ error: "Unable to create website integration." }, { status: 500 });
  }
}
