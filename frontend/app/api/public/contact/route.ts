import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactBody = {
  enquiryType?: unknown;
  fullName?: unknown;
  companyName?: unknown;
  email?: unknown;
  phone?: unknown;
  country?: unknown;
  teamSize?: unknown;
  message?: unknown;
  website?: unknown;
  sourcePath?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function email(value: unknown) {
  const result = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactBody;

    // Honeypot. Bots generally fill every visible/hidden text input.
    if (clean(body.website, 200)) {
      return NextResponse.json({ ok: true });
    }

    const fullName = clean(body.fullName, 160);
    const contactEmail = email(body.email);
    const companyName = clean(body.companyName, 200);
    const message = clean(body.message, 5000);
    const allowedTypes = new Set(["demo", "sales", "support", "general"]);
    const enquiryTypeRaw = clean(body.enquiryType, 30).toLowerCase();
    const enquiryType = allowedTypes.has(enquiryTypeRaw) ? enquiryTypeRaw : "demo";

    if (!fullName) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (!contactEmail) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ error: "Tell us a little about what you would like to see in AgriCore." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin.from("platform_leads").insert({
      enquiry_type: enquiryType,
      full_name: fullName,
      company_name: companyName || null,
      email: contactEmail,
      phone: clean(body.phone, 80) || null,
      country: clean(body.country, 120) || null,
      team_size: clean(body.teamSize, 80) || null,
      message,
      source_path: clean(body.sourcePath, 500) || request.nextUrl.pathname,
      referrer: clean(body.referrer, 1000) || request.headers.get("referer") || null,
      utm_source: clean(body.utmSource, 120) || null,
      utm_medium: clean(body.utmMedium, 120) || null,
      utm_campaign: clean(body.utmCampaign, 160) || null,
      status: "new",
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Public contact enquiry failed:", error);
    return NextResponse.json(
      { error: "Unable to send your request right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
