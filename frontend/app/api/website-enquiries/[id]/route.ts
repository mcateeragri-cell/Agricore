import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canViewWebsiteEnquiries } from "@/lib/website-enquiries/access";
import { cleanWebsiteText } from "@/lib/website-enquiries/normalise";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    if (!canViewWebsiteEnquiries(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const body = await request.json() as { status?: unknown; rejectionReason?: unknown; internalNotes?: unknown };
    const status = cleanWebsiteText(body.status, 40);
    if (!['new','reviewing','rejected'].includes(status)) {
      return NextResponse.json({ error: "Invalid enquiry status." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const update: Record<string, unknown> = {
      status,
      internal_notes: cleanWebsiteText(body.internalNotes, 3000) || null,
      updated_at: new Date().toISOString(),
    };
    if (status === 'rejected') {
      update.rejected_by = auth.userId;
      update.rejected_at = new Date().toISOString();
      update.rejection_reason = cleanWebsiteText(body.rejectionReason, 1000) || null;
    } else {
      update.rejected_by = null;
      update.rejected_at = null;
      update.rejection_reason = null;
    }

    const { data, error } = await admin
      .from("website_enquiries")
      .update(update)
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .neq("status", "accepted")
      .select("id,status,rejection_reason,internal_notes")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Enquiry was not found or is already accepted." }, { status: 404 });
    return NextResponse.json({ enquiry: data });
  } catch (error) {
    console.error("Unable to update website enquiry:", error);
    return NextResponse.json({ error: "Unable to update website enquiry." }, { status: 500 });
  }
}
