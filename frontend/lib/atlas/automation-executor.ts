import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AtlasOverview } from "@/lib/atlas/analysis";

export type AtlasAutomationResult = {
  evaluated: number;
  alerts: number;
  resolved: number;
};

export async function executeAtlasAutomations(
  admin: SupabaseClient,
  companyId: string,
  overview: AtlasOverview,
): Promise<AtlasAutomationResult> {
  const { data: rules, error } = await admin
    .from("atlas_automation_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("enabled", true);

  if (error) throw new Error(error.message);

  const alerts: Array<{
    severity: string;
    title: string;
    detail: string;
    href?: string;
    rule_id: string;
  }> = [];

  for (const rule of rules ?? []) {
    const threshold = Number(rule.threshold ?? 0);

    if (
      rule.rule_type === "service_due" &&
      overview.fleet.overdueServices + overview.fleet.dueSoonServices > threshold
    ) {
      alerts.push({
        rule_id: rule.id,
        severity: "attention",
        title: "Service workload requires attention",
        detail: `${overview.fleet.overdueServices} overdue and ${overview.fleet.dueSoonServices} due soon.`,
        href: "/service-programmes",
      });
    }

    if (
      rule.rule_type === "high_parts_cost" &&
      overview.profitability.partsCost > threshold
    ) {
      alerts.push({
        rule_id: rule.id,
        severity: "attention",
        title: "Parts cost threshold exceeded",
        detail: "Recorded parts cost has exceeded the configured threshold.",
        href: "/reports",
      });
    }

    if (rule.rule_type === "low_stock") {
      const { count, error: countError } = await admin
        .from("stock_items")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("active", true)
        .lte("quantity_in_stock", 0);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) > threshold) {
        alerts.push({
          rule_id: rule.id,
          severity: "attention",
          title: "Stock replenishment required",
          detail: `${count ?? 0} active stock items are out of stock.`,
          href: "/stock",
        });
      }
    }

    if (rule.rule_type === "job_completed_uninvoiced") {
      const { data: completed, error: completedError } = await admin
        .from("jobs")
        .select("id,job_number")
        .eq("company_id", companyId)
        .in("status", ["completed", "closed"]);
      if (completedError) throw new Error(completedError.message);

      const ids = (completed ?? []).map((row) => row.id);
      if (ids.length) {
        const { data: invoices, error: invoicesError } = await admin
          .from("invoices")
          .select("job_id")
          .eq("company_id", companyId)
          .in("job_id", ids);
        if (invoicesError) throw new Error(invoicesError.message);

        const invoiced = new Set(
          (invoices ?? []).map((row) => row.job_id).filter(Boolean),
        );
        const missing = (completed ?? []).filter((row) => !invoiced.has(row.id));
        if (missing.length > threshold) {
          alerts.push({
            rule_id: rule.id,
            severity: "opportunity",
            title: "Completed jobs awaiting invoice",
            detail: `${missing.length} completed jobs do not yet have an invoice.`,
            href: "/jobs",
          });
        }
      }
    }

    if (rule.rule_type === "quote_stale") {
      const days = Math.max(1, threshold || 14);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const { count, error: quoteError } = await admin
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["draft", "sent", "pending"])
        .lt("created_at", cutoff.toISOString());
      if (quoteError) throw new Error(quoteError.message);
      if ((count ?? 0) > 0) {
        alerts.push({
          rule_id: rule.id,
          severity: "opportunity",
          title: "Quotes need follow-up",
          detail: `${count ?? 0} open quotes are older than ${days} days.`,
          href: "/quotes",
        });
      }
    }
  }

  const now = new Date().toISOString();
  const activeFingerprints = new Set<string>();

  for (const item of alerts) {
    const fingerprint = `${item.rule_id}:${item.title}`;
    activeFingerprints.add(fingerprint);
    const { error: alertError } = await admin.from("atlas_alerts").upsert(
      {
        company_id: companyId,
        rule_id: item.rule_id,
        severity: item.severity,
        title: item.title,
        detail: item.detail,
        href: item.href ?? null,
        status: "open",
        fingerprint,
        last_seen_at: now,
        resolved_at: null,
      },
      { onConflict: "company_id,fingerprint" },
    );
    if (alertError) throw new Error(alertError.message);
  }

  let resolved = 0;
  const ruleIds = (rules ?? []).map((rule) => rule.id);
  if (ruleIds.length) {
    const { data: openRows, error: openError } = await admin
      .from("atlas_alerts")
      .select("id,fingerprint")
      .eq("company_id", companyId)
      .eq("status", "open")
      .in("rule_id", ruleIds);
    if (openError) throw new Error(openError.message);

    const staleIds = (openRows ?? [])
      .filter((row) => !activeFingerprints.has(String(row.fingerprint)))
      .map((row) => row.id);

    if (staleIds.length) {
      const { error: resolveError } = await admin
        .from("atlas_alerts")
        .update({ status: "resolved", resolved_at: now })
        .in("id", staleIds);
      if (resolveError) throw new Error(resolveError.message);
      resolved = staleIds.length;
    }
  }

  return {
    evaluated: (rules ?? []).length,
    alerts: alerts.length,
    resolved,
  };
}
