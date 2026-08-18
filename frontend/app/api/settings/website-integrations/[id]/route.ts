import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageWebsiteIntegrations } from "@/lib/website-enquiries/access";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canManageWebsiteIntegrations(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("company_website_integrations")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .select("id,active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
    return NextResponse.json({ integration: data });
  } catch (error) {
    console.error("Unable to revoke website integration:", error);
    return NextResponse.json({ error: "Unable to revoke website integration." }, { status: 500 });
  }
}
