import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canManageCompany, writePlatformAudit } from "@/lib/platform/core";
import { reverseFinanceJournal } from "@/lib/platform/finance";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManageCompany(auth) && !auth.permissions.includes("finance.post")) return NextResponse.json({ error: "Finance posting permission is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const journalId = String(body.journal_id ?? "").trim();
  const reversalDate = String(body.reversal_date ?? new Date().toISOString().slice(0,10));
  const reason = String(body.reason ?? "Controlled finance reversal").trim().slice(0,500);
  if (!journalId || !/^\d{4}-\d{2}-\d{2}$/.test(reversalDate)) return NextResponse.json({ error: "Journal and reversal date are required." }, { status: 400 });
  const admin = createSupabaseAdmin();
  const reversalId = await reverseFinanceJournal(admin, { companyId: auth.companyId, journalId, reversalDate, reason });
  await writePlatformAudit(admin, { companyId: auth.companyId, userId: auth.userId, entityType: "finance_journal", entityId: journalId, entityReference: journalId, action: "finance_journal_reversed", metadata: { reversal_id: reversalId, reason, reversal_date: reversalDate } });
  return NextResponse.json({ reversalId });
}
