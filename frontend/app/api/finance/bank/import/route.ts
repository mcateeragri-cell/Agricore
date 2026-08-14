import { requireApiModule } from "@/lib/modules/api-access";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";

export const dynamic = "force-dynamic";

function allowed(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return canManageCompany(auth) || auth.permissions.includes("settings.manage") || auth.permissions.includes("finance.manage");
}
function money(value: unknown) { const n = Number(String(value ?? "0").replace(/[£,$\s]/g, "")); return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0; }
function rows(csv: string) {
  const output: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) { const c = csv[i]; const next = csv[i + 1]; if (c === '"' && quoted && next === '"') { field += '"'; i += 1; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { row.push(field); field = ""; } else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && next === "\n") i += 1; row.push(field); if (row.some((v) => v.trim())) output.push(row); row = []; field = ""; } else field += c; }
  row.push(field); if (row.some((v) => v.trim())) output.push(row); return output;
}
function dateValue(value: string) {
  const raw = value.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const uk = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/); if (!uk) return null;
  const year = uk[3].length === 2 ? `20${uk[3]}` : uk[3]; return `${year}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
}
function headerIndex(headers: string[], names: string[]) { return headers.findIndex((h) => names.includes(h.toLowerCase().replace(/[^a-z0-9]/g, ""))); }

export async function POST(request: NextRequest) {
  const moduleGate = await requireApiModule("financial_control");
  if (moduleGate) return moduleGate;

  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!allowed(auth)) return NextResponse.json({ error: "Finance management permission is required." }, { status: 403 });

  const body = await request.json().catch(() => ({})); const bankAccountId = String(body.bank_account_id ?? "").trim(); const csv = String(body.csv ?? "");
  if (!bankAccountId || !csv.trim()) return NextResponse.json({ error: "Bank account and CSV data are required." }, { status: 400 });
  const parsed = rows(csv); if (parsed.length < 2) return NextResponse.json({ error: "CSV must contain a header and at least one transaction." }, { status: 400 });

  const headers = parsed[0].map((h) => h.trim()); const dateIndex = headerIndex(headers, ["date", "transactiondate", "valuedate"]); const descriptionIndex = headerIndex(headers, ["description", "details", "narrative", "merchant"]); const referenceIndex = headerIndex(headers, ["reference", "ref", "transactionreference"]); const amountIndex = headerIndex(headers, ["amount", "transactionamount"]); const debitIndex = headerIndex(headers, ["debit", "moneyout", "withdrawal"]); const creditIndex = headerIndex(headers, ["credit", "moneyin", "deposit"]); const balanceIndex = headerIndex(headers, ["balance", "runningbalance"]); const idIndex = headerIndex(headers, ["id", "transactionid", "externalid"]);
  if (dateIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) return NextResponse.json({ error: "CSV needs a Date column and either Amount or Debit/Credit columns." }, { status: 400 });

  const admin = createSupabaseAdmin(); const { data: account, error: accountError } = await admin.from("finance_bank_accounts").select("id").eq("company_id", auth.companyId).eq("id", bankAccountId).eq("active", true).maybeSingle();
  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 }); if (!account) return NextResponse.json({ error: "Bank account was not found." }, { status: 400 });
  const batch = `BANK-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`; const payload: Record<string, unknown>[] = []; let rejected = 0;
  for (let index = 1; index < parsed.length; index += 1) { const values = parsed[index]; const transactionDate = dateValue(values[dateIndex] ?? ""); let amount = amountIndex >= 0 ? money(values[amountIndex]) : money(values[creditIndex] ?? 0) - money(values[debitIndex] ?? 0); if (!transactionDate || Math.abs(amount) < 0.005) { rejected += 1; continue; } amount = money(amount); const external = idIndex >= 0 ? String(values[idIndex] ?? "").trim() : ""; const description = descriptionIndex >= 0 ? String(values[descriptionIndex] ?? "").trim() : ""; const reference = referenceIndex >= 0 ? String(values[referenceIndex] ?? "").trim() : ""; const fallbackId = `${transactionDate}|${amount.toFixed(2)}|${description}|${reference}`;
    payload.push({ company_id: auth.companyId, bank_account_id: bankAccountId, transaction_date: transactionDate, transaction_type: amount >= 0 ? "credit" : "debit", description: description || null, reference: reference || null, amount, running_balance: balanceIndex >= 0 ? money(values[balanceIndex]) : null, external_id: external || fallbackId, reconciliation_status: "unmatched", import_batch: batch, imported_by: auth.userId }); }
  if (!payload.length) return NextResponse.json({ error: "No valid transactions were found in the CSV." }, { status: 400 });
  const { data, error } = await admin.from("finance_bank_transactions").upsert(payload, { onConflict: "company_id,bank_account_id,external_id", ignoreDuplicates: true }).select("id"); if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_bank_import", entityId: batch, entityReference: batch, action: "finance_bank_csv_imported", metadata: { bank_account_id: bankAccountId, accepted: data?.length ?? 0, rejected } });
  return NextResponse.json({ batch, imported: data?.length ?? 0, rejected });
}
