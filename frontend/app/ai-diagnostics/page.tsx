import { redirect } from "next/navigation";

import AiDiagnosticsClient from "@/Components/ai/ai-diagnostics-client";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const dynamic = "force-dynamic";

export default async function AiDiagnosticsPage() {
  const context = await requirePermission(["ai_diagnostics.use"]);
  const enabled = await isCompanyFeatureEnabled(createSupabaseAdmin(), context.companyId, "ai_diagnostics");
  if (!enabled) redirect("/unauthorised");
  return <AiDiagnosticsClient />;
}
