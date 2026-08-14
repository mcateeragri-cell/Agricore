import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany } from "@/lib/platform/core";
import { normaliseFinanceProfileUpdate } from "@/lib/platform/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administration permission is required." }, { status: 403 });
  const admin = createSupabaseAdmin();
  const [profile, accounts, periods, taxCodes, journals, postingQueue, taxPeriods, taxSettings, validationIssues] = await Promise.all([
    admin.from("finance_profiles").select("*").eq("company_id", auth.companyId).maybeSingle(),
    admin.from("finance_accounts").select("id,code,name,account_type,normal_balance,system_key,active").eq("company_id", auth.companyId).order("code"),
    admin.from("finance_periods").select("id,name,starts_on,ends_on,status").eq("company_id", auth.companyId).order("starts_on", { ascending: false }).limit(24),
    admin.from("finance_tax_codes").select("id,code,name,rate,tax_kind,active").eq("company_id", auth.companyId).order("code"),
    admin.from("finance_journals").select("id,journal_date,status,source_type,source_id,source_action,reference,description,currency_code,posted_at").eq("company_id", auth.companyId).order("created_at", { ascending: false }).limit(20),
    admin.from("atlas_queue").select("id,status,last_error,created_at").eq("company_id", auth.companyId).eq("task_type", "finance_posting").in("status", ["queued","running","failed"]).order("created_at", { ascending: false }).limit(50),
    admin.from("finance_tax_periods").select("id,name,starts_on,ends_on,status,prepared_at,reviewed_at,locked_at").eq("company_id", auth.companyId).order("starts_on", { ascending: false }).limit(24),
    admin.from("finance_tax_settings").select("jurisdiction_code,registration_number,filing_frequency,prices_include_tax,reporting_currency_code").eq("company_id", auth.companyId).maybeSingle(),
    admin.from("finance_validation_issues").select("id,severity,category,title,detail,status,last_seen_at").eq("company_id", auth.companyId).eq("status", "open").order("last_seen_at", { ascending: false }).limit(100),
  ]);
  const error = profile.error || accounts.error || periods.error || taxCodes.error || journals.error || postingQueue.error || taxPeriods.error || taxSettings.error || validationIssues.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    profile: profile.data,
    accounts: accounts.data ?? [],
    periods: periods.data ?? [],
    taxCodes: taxCodes.data ?? [],
    journals: journals.data ?? [],
    financeQueue: postingQueue.data ?? [],
    taxPeriods: taxPeriods.data ?? [],
    taxSettings: taxSettings.data ?? null,
    validationIssues: validationIssues.data ?? [],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth)) return NextResponse.json({ error: "Company administration permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const update = normaliseFinanceProfileUpdate(body);
  if (!/^[A-Z]{2}$/.test(update.country_code)) return NextResponse.json({ error: "Country must be a two-letter ISO code." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(update.base_currency_code)) return NextResponse.json({ error: "Currency must be a three-letter ISO code." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("finance_profiles").upsert({ company_id: auth.companyId, ...update }, { onConflict: "company_id" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
