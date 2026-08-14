import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth) && !auth.permissions.includes("finance.tax")) return NextResponse.json({ error: "Tax management permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0,120);
  const startsOn = String(body.starts_on ?? "");
  const endsOn = String(body.ends_on ?? "");
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) return NextResponse.json({ error: "A valid name, start date and end date are required." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("finance_tax_periods").insert({ company_id: auth.companyId, name, starts_on: startsOn, ends_on: endsOn }).select("id,name,starts_on,ends_on,status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_tax_period", entityId: data.id, entityReference: name, action: "finance_tax_period_created" });
  return NextResponse.json({ period: data });
}

export async function PATCH(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth) && !auth.permissions.includes("finance.tax")) return NextResponse.json({ error: "Tax management permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim().toLowerCase();
  if (!id || !["open","prepared","reviewed","locked"].includes(status)) return NextResponse.json({ error: "A valid tax period and status are required." }, { status: 400 });
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status, updated_at: now };
  if (status === "prepared") { update.prepared_at = now; update.prepared_by = auth.userId; }
  if (status === "reviewed") { update.reviewed_at = now; update.reviewed_by = auth.userId; }
  if (status === "locked") { update.locked_at = now; update.locked_by = auth.userId; }
  if (status === "open") { update.prepared_at = null; update.prepared_by = null; update.reviewed_at = null; update.reviewed_by = null; update.locked_at = null; update.locked_by = null; }
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("finance_tax_periods").update(update).eq("company_id", auth.companyId).eq("id", id).select("id,name,starts_on,ends_on,status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_tax_period", entityId: id, entityReference: data.name, action: `finance_tax_period_${status}` });
  return NextResponse.json({ period: data });
}
