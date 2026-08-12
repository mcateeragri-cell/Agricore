import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function reverseFinanceJournal(admin: SupabaseClient, args: {
  companyId: string;
  journalId: string;
  reversalDate: string;
  reason: string;
  sourceEventId?: string | null;
}) {
  const { data, error } = await admin.rpc("finance_reverse_journal", {
    p_company_id: args.companyId,
    p_journal_id: args.journalId,
    p_reversal_date: args.reversalDate,
    p_reason: args.reason,
    p_source_event_id: args.sourceEventId ?? null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}
