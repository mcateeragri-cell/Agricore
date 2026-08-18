import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canViewWebsiteEnquiries } from "@/lib/website-enquiries/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canViewWebsiteEnquiries(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createSupabaseAdmin();
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? "";

    let query = admin
      .from("website_enquiries")
      .select(`
        id,branch_id,source_reference,source,submitted_at,contact_name,business_name,phone,email,
        enquiry_type,location,machine_description,urgency,requested_dates,work_environment,brands,
        preferred_contact,message,source_page,referrer,utm_source,utm_medium,utm_campaign,status,
        customer_id,machine_id,accepted_job_id,accepted_at,rejected_at,rejection_reason,internal_notes,
        company_branches(id,name,code),jobs(id,job_number,status)
      `)
      .eq("company_id", auth.companyId)
      .order("submitted_at", { ascending: false })
      .limit(250);

    const allowedBranches = auth.activeBranchId
      ? [auth.activeBranchId]
      : auth.operationsScope === "company"
        ? []
        : auth.accessibleOperationalBranchIds;

    if (allowedBranches.length > 0) query = query.in("branch_id", allowedBranches);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ enquiries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load website enquiries:", error);
    return NextResponse.json({ error: "Unable to load website enquiries." }, { status: 500 });
  }
}
