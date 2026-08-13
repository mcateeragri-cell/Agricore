import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import {
  cleanDomain,
  createResendDomain,
  getResendDomain,
  isValidCompanyDomain,
} from "@/lib/communications/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function saveDomainState(
  companyId: string,
  domain: {
    id: string;
    name: string;
    status: string;
    records?: unknown[];
  },
) {
  const admin = createSupabaseAdmin();
  const verified = domain.status === "verified";

  const { data, error } = await admin
    .from("company_email_settings")
    .upsert(
      {
        company_id: companyId,
        provider: "resend",
        email_mode: "custom_domain",
        custom_domain: domain.name,
        resend_domain_id: domain.id,
        domain_status: domain.status,
        domain_records: domain.records ?? [],
        domain_last_checked_at: new Date().toISOString(),
        custom_sender_verified: verified,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function GET() {
  try {
    const user = await requirePermission(["settings.manage"]);
    const admin = createSupabaseAdmin();

    const { data: settings, error } = await admin
      .from("company_email_settings")
      .select("*")
      .eq("company_id", user.companyId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!settings?.resend_domain_id) {
      return NextResponse.json({ domain: null, settings });
    }

    const domain = await getResendDomain(settings.resend_domain_id);
    const updated = await saveDomainState(user.companyId, domain);

    return NextResponse.json({ domain, settings: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load custom email domain.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(["settings.manage"]);
    const body = (await request.json()) as { domain?: unknown };
    const domainName =
      typeof body.domain === "string" ? cleanDomain(body.domain) : "";

    if (!isValidCompanyDomain(domainName)) {
      return NextResponse.json(
        {
          error:
            "Enter a domain owned by your business, for example company.co.uk. Public email domains such as Gmail cannot be verified.",
        },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();
    const { data: current, error: currentError } = await admin
      .from("company_email_settings")
      .select("resend_domain_id,custom_domain")
      .eq("company_id", user.companyId)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);

    if (
      current?.resend_domain_id &&
      cleanDomain(current.custom_domain || "") === domainName
    ) {
      const existing = await getResendDomain(current.resend_domain_id);
      const updated = await saveDomainState(user.companyId, existing);
      return NextResponse.json({ domain: existing, settings: updated });
    }

    const created = await createResendDomain(domainName);
    const updated = await saveDomainState(user.companyId, created);

    return NextResponse.json({ domain: created, settings: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add custom email domain.",
      },
      { status: 500 },
    );
  }
}
