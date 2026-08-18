import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { cleanWebsiteEmail, cleanWebsiteText } from "@/lib/website-enquiries/normalise";
import { hashWebsiteIntegrationToken } from "@/lib/website-enquiries/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingEnquiry = {
  reference?: unknown;
  source?: unknown;
  submittedAt?: unknown;
  name?: unknown;
  company?: unknown;
  phone?: unknown;
  email?: unknown;
  type?: unknown;
  location?: unknown;
  machine?: unknown;
  urgency?: unknown;
  dates?: unknown;
  environment?: unknown;
  brands?: unknown;
  preferredContact?: unknown;
  message?: unknown;
  attribution?: {
    sourcePage?: unknown;
    referrer?: unknown;
    utmSource?: unknown;
    utmMedium?: unknown;
    utmCampaign?: unknown;
  };
};

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Integration token required." }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const secretHash = hashWebsiteIntegrationToken(token);

    const { data: integration, error: integrationError } = await admin
      .from("company_website_integrations")
      .select("id,company_id,default_branch_id,active")
      .eq("secret_hash", secretHash)
      .eq("active", true)
      .maybeSingle();

    if (integrationError) throw new Error(integrationError.message);
    if (!integration) {
      return NextResponse.json({ ok: false, error: "Invalid integration token." }, { status: 401 });
    }

    const body = (await request.json()) as IncomingEnquiry;
    const name = cleanWebsiteText(body.name, 120);
    const phone = cleanWebsiteText(body.phone, 80);
    const location = cleanWebsiteText(body.location, 180);
    const message = cleanWebsiteText(body.message, 3000);

    if (!name || !phone || !location || !message) {
      return NextResponse.json(
        { ok: false, error: "Name, phone, location and enquiry details are required." },
        { status: 400 },
      );
    }

    let branchId = cleanWebsiteText(integration.default_branch_id, 80) || null;
    if (!branchId) {
      const { data: branch, error: branchError } = await admin
        .from("company_branches")
        .select("id")
        .eq("company_id", integration.company_id)
        .eq("active", true)
        .order("is_head_office", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (branchError) throw new Error(branchError.message);
      branchId = branch?.id ?? null;
    }

    const submittedAtRaw = cleanWebsiteText(body.submittedAt, 80);
    const submittedAt = submittedAtRaw && !Number.isNaN(Date.parse(submittedAtRaw))
      ? new Date(submittedAtRaw).toISOString()
      : new Date().toISOString();

    const row = {
      company_id: integration.company_id,
      integration_id: integration.id,
      branch_id: branchId,
      source_reference: cleanWebsiteText(body.reference, 120) || null,
      source: cleanWebsiteText(body.source, 160) || "website",
      submitted_at: submittedAt,
      contact_name: name,
      business_name: cleanWebsiteText(body.company, 160) || null,
      phone,
      email: cleanWebsiteEmail(body.email) || null,
      enquiry_type: cleanWebsiteText(body.type, 120) || null,
      location,
      machine_description: cleanWebsiteText(body.machine, 260) || null,
      urgency: cleanWebsiteText(body.urgency, 120) || null,
      requested_dates: cleanWebsiteText(body.dates, 180) || null,
      work_environment: cleanWebsiteText(body.environment, 120) || null,
      brands: cleanWebsiteText(body.brands, 260) || null,
      preferred_contact: cleanWebsiteText(body.preferredContact, 80) || null,
      message,
      source_page: cleanWebsiteText(body.attribution?.sourcePage, 300) || null,
      referrer: cleanWebsiteText(body.attribution?.referrer, 500) || null,
      utm_source: cleanWebsiteText(body.attribution?.utmSource, 160) || null,
      utm_medium: cleanWebsiteText(body.attribution?.utmMedium, 160) || null,
      utm_campaign: cleanWebsiteText(body.attribution?.utmCampaign, 200) || null,
      status: "new",
    };

    const { data: created, error: insertError } = await admin
      .from("website_enquiries")
      .insert(row)
      .select("id,source_reference,status")
      .single();

    if (insertError) {
      if (insertError.code === "23505" && row.source_reference) {
        const { data: existing } = await admin
          .from("website_enquiries")
          .select("id,source_reference,status")
          .eq("company_id", integration.company_id)
          .eq("source_reference", row.source_reference)
          .maybeSingle();
        if (existing) return NextResponse.json({ ok: true, duplicate: true, enquiry: existing });
      }
      throw new Error(insertError.message);
    }

    await admin
      .from("company_website_integrations")
      .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", integration.id);

    return NextResponse.json({ ok: true, enquiry: created }, { status: 201 });
  } catch (error) {
    console.error("Public website enquiry ingest failed:", error);
    return NextResponse.json({ ok: false, error: "Unable to receive website enquiry." }, { status: 500 });
  }
}
