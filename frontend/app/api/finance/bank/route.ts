import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

function allowed(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return canManageCompany(auth) || auth.permissions.includes("settings.manage") || auth.permissions.includes("finance.manage") || auth.permissions.includes("finance.reports");
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance permission is required." }, { status: 403 });

  const bankAccountId = request.nextUrl.searchParams.get("bank_account_id");
  const admin = createSupabaseAdmin();
  const [bankAccounts, financeAccounts, transactionResult, payments, journals] = await Promise.all([
    admin.from("finance_bank_accounts").select("id,finance_account_id,name,bank_name,account_reference,currency_code,opening_balance,is_default,active").eq("company_id", auth.companyId).order("is_default", { ascending: false }).order("name"),
    admin.from("finance_accounts").select("id,code,name,account_type,system_key").eq("company_id", auth.companyId).eq("active", true).eq("account_type", "asset").order("code"),
    bankAccountId
      ? admin.from("finance_bank_transactions").select("id,bank_account_id,transaction_date,transaction_type,description,reference,amount,running_balance,external_id,reconciliation_status,import_batch,created_at").eq("company_id", auth.companyId).eq("bank_account_id", bankAccountId).order("transaction_date", { ascending: false }).limit(500)
      : admin.from("finance_bank_transactions").select("id,bank_account_id,transaction_date,transaction_type,description,reference,amount,running_balance,external_id,reconciliation_status,import_batch,created_at").eq("company_id", auth.companyId).order("transaction_date", { ascending: false }).limit(500),
    admin.from("finance_supplier_payments").select("id,supplier_id,payment_date,amount,reference,bank_account_id,status,stock_suppliers(name)").eq("company_id", auth.companyId).eq("status", "posted").order("payment_date", { ascending: false }).limit(250),
    admin.from("finance_journals").select("id,journal_date,reference,description,source_type,source_id,source_action,status,finance_journal_lines!inner(account_id,debit,credit,finance_accounts!inner(account_type,system_key))").eq("company_id", auth.companyId).eq("status", "posted").order("journal_date", { ascending: false }).limit(350),
  ]);

  const error = bankAccounts.error || financeAccounts.error || transactionResult.error || payments.error || journals.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    bankAccounts: bankAccounts.data ?? [],
    financeAccounts: financeAccounts.data ?? [],
    transactions: transactionResult.data ?? [],
    supplierPayments: payments.data ?? [],
    journals: journals.data ?? [],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const financeAccountId = String(body.finance_account_id ?? "").trim();
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!financeAccountId || !name) return NextResponse.json({ error: "Name and linked finance account are required." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("finance_bank_accounts").insert({
    company_id: auth.companyId,
    finance_account_id: financeAccountId,
    name,
    bank_name: String(body.bank_name ?? "").trim().slice(0, 120) || null,
    account_reference: String(body.account_reference ?? "").trim().slice(0, 120) || null,
    currency_code: String(body.currency_code ?? "GBP").trim().toUpperCase().slice(0, 3),
    opening_balance: Number(body.opening_balance ?? 0) || 0,
    is_default: body.is_default === true,
    active: true,
  }).select("id,name,bank_name,currency_code,is_default").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_bank_account", entityId: data.id, entityReference: data.name, action: "finance_bank_account_created" });
  return NextResponse.json({ bankAccount: data }, { status: 201 });
}
