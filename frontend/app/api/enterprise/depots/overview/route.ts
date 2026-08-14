import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOSED = new Set(["completed", "cancelled", "closed", "invoiced"]);
const number = (value: unknown) => Number(value ?? 0) || 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function weekBounds() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET() {
  try {
    const auth = await requirePermission(["settings.manage", "jobs.view_all", "finance.reports"]);
    const admin = createSupabaseAdmin();
    if (!(await isCompanyFeatureEnabled(admin, auth.companyId, "multi_branch"))) {
      return NextResponse.json({ error: "Depot overview is available on Enterprise." }, { status: 403 });
    }

    const allowed = new Set(auth.accessibleOperationalBranchIds);
    const { start, end } = weekBounds();

    const [branchesResult, jobsResult, assignmentsResult, profilesResult, rolesResult, scopesResult, invoicesResult, journalResult] = await Promise.all([
      admin.from("company_branches")
        .select("id,code,name,branch_type,is_head_office,address,manager_user_id,active")
        .eq("company_id", auth.companyId)
        .eq("active", true)
        .order("is_head_office", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      admin.from("jobs")
        .select("id,branch_id,status")
        .eq("company_id", auth.companyId),
      admin.from("job_assignments")
        .select("id,branch_id,user_id,scheduled_start,scheduled_end,assignment_status")
        .eq("company_id", auth.companyId)
        .gte("scheduled_start", start)
        .lt("scheduled_start", end)
        .neq("assignment_status", "cancelled"),
      admin.from("company_member_profiles")
        .select("user_id,full_name,is_active,contracted_hours_per_week")
        .eq("company_id", auth.companyId)
        .eq("is_active", true),
      admin.from("company_member_roles")
        .select("user_id,role")
        .eq("company_id", auth.companyId),
      admin.from("company_member_branch_scopes")
        .select("user_id,home_branch_id")
        .eq("company_id", auth.companyId),
      admin.from("invoices")
        .select("id,branch_id,status,total,amount_paid")
        .eq("company_id", auth.companyId),
      admin.from("finance_journal_lines")
        .select("debit,credit,finance_accounts!inner(account_type),finance_journals!inner(branch_id,status,journal_date)")
        .eq("company_id", auth.companyId)
        .eq("finance_journals.status", "posted"),
    ]);

    const firstError = branchesResult.error || jobsResult.error || assignmentsResult.error || profilesResult.error || rolesResult.error || scopesResult.error || invoicesResult.error || journalResult.error;
    if (firstError) throw new Error(firstError.message);

    const branches = (branchesResult.data ?? []).filter((branch) => allowed.has(String(branch.id)));
    const jobs = jobsResult.data ?? [];
    const assignments = assignmentsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const roles = rolesResult.data ?? [];
    const scopes = scopesResult.data ?? [];
    const invoices = invoicesResult.data ?? [];

    const roleMap = new Map(roles.map((row) => [String(row.user_id), String(row.role ?? "")]));
    const profileMap = new Map(profiles.map((row) => [String(row.user_id), row]));
    const homeMap = new Map(scopes.map((row) => [String(row.user_id), row.home_branch_id ? String(row.home_branch_id) : null]));

    const financialByBranch = new Map<string, { revenue: number; expenses: number }>();
    for (const line of journalResult.data ?? []) {
      const journal = line.finance_journals as unknown as { branch_id: string | null; status: string | null };
      const account = line.finance_accounts as unknown as { account_type: string | null };
      const branchId = journal?.branch_id ? String(journal.branch_id) : "";
      if (!branchId || !allowed.has(branchId)) continue;
      const current = financialByBranch.get(branchId) ?? { revenue: 0, expenses: 0 };
      const debit = number(line.debit), credit = number(line.credit);
      if (account?.account_type === "income") current.revenue += credit - debit;
      if (account?.account_type === "expense") current.expenses += debit - credit;
      financialByBranch.set(branchId, current);
    }

    const rows = branches.map((branch) => {
      const branchId = String(branch.id);
      const branchJobs = jobs.filter((job) => String(job.branch_id ?? "") === branchId);
      const openJobs = branchJobs.filter((job) => !CLOSED.has(String(job.status ?? "").toLowerCase())).length;
      const completedJobs = branchJobs.filter((job) => CLOSED.has(String(job.status ?? "").toLowerCase())).length;
      const branchAssignments = assignments.filter((assignment) => String(assignment.branch_id ?? "") === branchId);
      const scheduledHours = branchAssignments.reduce((total, assignment) => {
        if (!assignment.scheduled_start) return total;
        const startMs = new Date(assignment.scheduled_start).getTime();
        const endMs = assignment.scheduled_end ? new Date(assignment.scheduled_end).getTime() : startMs + 60 * 60 * 1000;
        return total + Math.max(0, endMs - startMs) / 3_600_000;
      }, 0);

      const branchTechnicians = profiles.filter((profile) => {
        const userId = String(profile.user_id);
        const role = roleMap.get(userId) ?? "";
        return homeMap.get(userId) === branchId && ["technician", "apprentice", "service_manager"].includes(role);
      });
      const capacityHours = branchTechnicians.reduce((total, profile) => total + Math.max(0, number(profile.contracted_hours_per_week) || 40), 0);
      const loadPercent = capacityHours > 0 ? Math.round((scheduledHours / capacityHours) * 100) : 0;

      const branchInvoices = invoices.filter((invoice) => String(invoice.branch_id ?? "") === branchId && String(invoice.status ?? "").toLowerCase() !== "void");
      const invoiceTotal = branchInvoices.reduce((sum, invoice) => sum + number(invoice.total), 0);
      const outstanding = branchInvoices.reduce((sum, invoice) => sum + Math.max(0, number(invoice.total) - number(invoice.amount_paid)), 0);
      const financial = financialByBranch.get(branchId) ?? { revenue: 0, expenses: 0 };
      const manager = branch.manager_user_id ? profileMap.get(String(branch.manager_user_id)) : null;

      return {
        id: branchId,
        code: String(branch.code ?? ""),
        name: String(branch.name ?? "Depot"),
        branchType: String(branch.branch_type ?? "depot"),
        isHeadOffice: Boolean(branch.is_head_office),
        address: branch.address ? String(branch.address) : null,
        manager: manager ? { userId: String(manager.user_id), fullName: String(manager.full_name ?? "Manager") } : null,
        openJobs,
        completedJobs,
        technicianCount: branchTechnicians.length,
        scheduledHours: round(scheduledHours),
        capacityHours: round(capacityHours),
        loadPercent,
        invoiceTotal: round(invoiceTotal),
        outstanding: round(outstanding),
        revenue: round(financial.revenue),
        expenses: round(financial.expenses),
        profit: round(financial.revenue - financial.expenses),
      };
    });

    const totals = rows.reduce((acc, row) => ({
      openJobs: acc.openJobs + row.openJobs,
      technicians: acc.technicians + row.technicianCount,
      scheduledHours: acc.scheduledHours + row.scheduledHours,
      capacityHours: acc.capacityHours + row.capacityHours,
      revenue: acc.revenue + row.revenue,
      expenses: acc.expenses + row.expenses,
      outstanding: acc.outstanding + row.outstanding,
    }), { openJobs: 0, technicians: 0, scheduledHours: 0, capacityHours: 0, revenue: 0, expenses: 0, outstanding: 0 });

    return NextResponse.json({
      depots: rows,
      totals: {
        ...totals,
        loadPercent: totals.capacityHours > 0 ? Math.round((totals.scheduledHours / totals.capacityHours) * 100) : 0,
        profit: round(totals.revenue - totals.expenses),
      },
      week: { start, end },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load depot overview." }, { status: 500 });
  }
}
