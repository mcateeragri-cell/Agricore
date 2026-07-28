import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/payments/config";

export function createSupabaseAdmin() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>;
