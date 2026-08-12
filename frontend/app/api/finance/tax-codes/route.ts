import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

function canManage(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return canManageCompany(auth) || auth.permissions.includes("finance.manage") || auth.permissions.includes("finance.tax");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManage(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase().slice(0,32);
  const name = String(body.name ?? "").trim().slice(0,120);
  const rate = Number(body.rate ?? 0);
  const taxKind = String(body.tax_kind ?? "standard").trim().toLowerCase().slice(0,32);
  const effectiveFrom = String(body.effective_from ?? new Date().toISOString().slice(0,10));
  if (!code || !name || !Number.isFinite(rate) || rate < 0 || rate > 100) return NextResponse.json({ error: "A valid code, name and rate between 0 and 100 are required." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("finance_tax_codes").upsert({ company_id: auth.companyId, code, name, rate, tax_kind: taxKind, recoverable: body.recoverable !== false, active: body.active !== false, updated_at: new Date().toISOString() }, { onConflict: "company_id,code" }).select("id,code,name,rate,tax_kind,recoverable,active").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { error: rateError } = await admin.from("finance_tax_code_rates").upsert({ company_id: auth.companyId, tax_code_id: data.id, rate, effective_from: effectiveFrom }, { onConflict: "company_id,tax_code_id,effective_from" });
  if (rateError) return NextResponse.json({ error: rateError.message }, { status: 500 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_tax_code", entityId: data.id, entityReference: code, action: "finance_tax_code_saved", metadata: { rate, effective_from: effectiveFrom } });
  return NextResponse.json({ taxCode: data });
}
