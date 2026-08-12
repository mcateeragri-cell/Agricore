import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

function n(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replaceAll("_", " ");
}

function date(value: unknown) {
  if (!value) return null;
  const result = new Date(String(value));
  return Number.isNaN(result.getTime()) ? null : result;
}

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000);
}

function tokens(value: string) {
  const stop = new Set(["and","the","with","from","this","that","machine","fault","repair","check","not","for","but","was","has","had","after","when","job","customer","replace","replaced","service","serviced"]);
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length >= 4 && !stop.has(word));
}

async function rows(admin: SupabaseClient, table: string, select: string, companyId: string) {
  const result = await admin.from(table).select(select).eq("company_id", companyId);
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return (result.data ?? []) as AnyRow[];
}

export type AtlasOverview = {
  generatedAt: string;
  profitability: {
    invoiced: number;
    labourRevenue: number;
    labourCostEstimate: number;
    partsRevenue: number;
    partsCost: number;
    grossContributionEstimate: number;
    topJobs: Array<{ jobId: string; jobNumber: string; revenue: number; estimatedCost: number; contribution: number }>;
  };
  fleet: {
    machines: number;
    openJobs: number;
    overdueServices: number;
    dueSoonServices: number;
    recurringIssueGroups: number;
    repeatedIssues: Array<{ make: string; model: string; issue: string; count: number; machines: number }>;
  };
  servicePredictions: Array<{
    machineId: string;
    machine: string;
    registration: string;
    programme: string;
    remainingHours: number | null;
    predictedDate: string | null;
    status: "overdue" | "due_soon" | "forecast";
  }>;
  advisor: Array<{ severity: "info" | "attention" | "opportunity"; title: string; detail: string; href?: string }>;
};

export async function buildAtlasOverview(admin: SupabaseClient, companyId: string): Promise<AtlasOverview> {
  const [jobs, labour, parts, invoices, machines, services] = await Promise.all([
    rows(admin, "jobs", "id,job_number,machine_id,status,fault_reported,diagnosis,work_carried_out,opened_date,completed_date,created_at", companyId),
    rows(admin, "job_labour_entries", "job_id,hours,hourly_rate,entry_status", companyId),
    rows(admin, "job_parts_used", "job_id,quantity,unit_cost,unit_price,part_number,description", companyId),
    rows(admin, "invoices", "id,job_id,status,total,amount_paid,due_date,created_at", companyId),
    rows(admin, "machines", "id,make,model,registration,serial_number,hours,estimated_hours_per_week", companyId),
    rows(admin, "machine_service_programmes", "id,machine_id,last_service_hours,last_service_date,active,service_programme_id", companyId),
  ]);

  const serviceProgrammeIds = [...new Set(services.map((item) => item.service_programme_id).filter(Boolean))];
  let programmeRows: AnyRow[] = [];
  if (serviceProgrammeIds.length) {
    const result = await admin.from("service_programmes").select("id,name,interval_hours,interval_months").in("id", serviceProgrammeIds);
    if (!result.error) programmeRows = (result.data ?? []) as AnyRow[];
  }

  const machineById = new Map(machines.map((item) => [String(item.id), item]));
  const programmeById = new Map(programmeRows.map((item) => [String(item.id), item]));

  const labourByJob = new Map<string, { hours: number; value: number }>();
  for (const item of labour) {
    const key = String(item.job_id ?? "");
    const current = labourByJob.get(key) ?? { hours: 0, value: 0 };
    current.hours += n(item.hours);
    current.value += n(item.hours) * n(item.hourly_rate);
    labourByJob.set(key, current);
  }

  const partsByJob = new Map<string, { cost: number; revenue: number }>();
  for (const item of parts) {
    const key = String(item.job_id ?? "");
    const current = partsByJob.get(key) ?? { cost: 0, revenue: 0 };
    current.cost += n(item.quantity) * n(item.unit_cost);
    current.revenue += n(item.quantity) * n(item.unit_price);
    partsByJob.set(key, current);
  }

  const invoiceByJob = new Map<string, number>();
  for (const item of invoices) {
    if (!item.job_id || normalise(item.status) === "void") continue;
    invoiceByJob.set(String(item.job_id), (invoiceByJob.get(String(item.job_id)) ?? 0) + n(item.total));
  }

  let invoiced = 0;
  let labourRevenue = 0;
  let partsRevenue = 0;
  let partsCost = 0;
  const topJobs = jobs.map((job) => {
    const labourItem = labourByJob.get(String(job.id)) ?? { hours: 0, value: 0 };
    const partsItem = partsByJob.get(String(job.id)) ?? { cost: 0, revenue: 0 };
    const revenue = invoiceByJob.get(String(job.id)) ?? labourItem.value + partsItem.revenue;
    const labourCostEstimate = labourItem.value * 0.45;
    const estimatedCost = labourCostEstimate + partsItem.cost;
    invoiced += invoiceByJob.get(String(job.id)) ?? 0;
    labourRevenue += labourItem.value;
    partsRevenue += partsItem.revenue;
    partsCost += partsItem.cost;
    return {
      jobId: String(job.id),
      jobNumber: String(job.job_number ?? "Job"),
      revenue,
      estimatedCost,
      contribution: revenue - estimatedCost,
    };
  }).sort((a, b) => b.contribution - a.contribution).slice(0, 8);

  const grouped = new Map<string, { make: string; model: string; issue: string; count: number; machines: Set<string> }>();
  for (const job of jobs) {
    const machine = machineById.get(String(job.machine_id ?? ""));
    if (!machine) continue;
    const source = [job.fault_reported, job.diagnosis, job.work_carried_out].filter(Boolean).join(" ");
    const words = tokens(source);
    for (const word of new Set(words)) {
      const key = `${String(machine.make ?? "").toLowerCase()}|${String(machine.model ?? "").toLowerCase()}|${word}`;
      const current = grouped.get(key) ?? { make: String(machine.make ?? "Unknown"), model: String(machine.model ?? ""), issue: word, count: 0, machines: new Set<string>() };
      current.count += 1;
      current.machines.add(String(machine.id));
      grouped.set(key, current);
    }
  }
  const repeatedIssues = [...grouped.values()].filter((item) => item.count >= 3 && item.machines.size >= 2).sort((a, b) => b.count - a.count).slice(0, 12).map((item) => ({ make: item.make, model: item.model, issue: item.issue, count: item.count, machines: item.machines.size }));

  const now = new Date();
  const servicePredictions: AtlasOverview["servicePredictions"] = [];
  let overdueServices = 0;
  let dueSoonServices = 0;
  for (const service of services) {
    if (service.active === false) continue;
    const machine = machineById.get(String(service.machine_id ?? ""));
    const programme = programmeById.get(String(service.service_programme_id ?? ""));
    if (!machine || !programme) continue;
    const intervalHours = programme.interval_hours == null ? null : n(programme.interval_hours);
    const currentHours = n(machine.hours);
    const lastHours = service.last_service_hours == null ? currentHours : n(service.last_service_hours);
    const remainingHours = intervalHours == null ? null : lastHours + intervalHours - currentHours;
    let predicted: Date | null = null;
    if (remainingHours != null && n(machine.estimated_hours_per_week) > 0) {
      predicted = new Date(now);
      predicted.setDate(predicted.getDate() + Math.ceil((Math.max(0, remainingHours) / n(machine.estimated_hours_per_week)) * 7));
    }
    if (programme.interval_months && service.last_service_date) {
      const calendar = date(service.last_service_date);
      if (calendar) {
        calendar.setMonth(calendar.getMonth() + n(programme.interval_months));
        if (!predicted || calendar < predicted) predicted = calendar;
      }
    }
    const overdue = (remainingHours != null && remainingHours < 0) || (predicted && predicted < now);
    const dueSoon = !overdue && ((remainingHours != null && remainingHours <= 50) || (predicted && daysBetween(now, predicted) <= 30));
    if (overdue) overdueServices += 1;
    else if (dueSoon) dueSoonServices += 1;
    if (overdue || dueSoon || predicted) {
      servicePredictions.push({
        machineId: String(machine.id),
        machine: [machine.make, machine.model].filter(Boolean).join(" ") || "Machine",
        registration: String(machine.registration ?? machine.serial_number ?? ""),
        programme: String(programme.name ?? "Service programme"),
        remainingHours: remainingHours == null ? null : Math.round(remainingHours),
        predictedDate: predicted?.toISOString() ?? null,
        status: overdue ? "overdue" : dueSoon ? "due_soon" : "forecast",
      });
    }
  }
  servicePredictions.sort((a, b) => (a.predictedDate ?? "9999").localeCompare(b.predictedDate ?? "9999"));

  const openJobs = jobs.filter((item) => !["completed","closed","cancelled"].includes(normalise(item.status))).length;
  const overdueInvoices = invoices.filter((item) => {
    if (["paid","void","cancelled"].includes(normalise(item.status))) return false;
    const due = date(item.due_date);
    return Boolean(due && due < now && n(item.total) - n(item.amount_paid) > 0);
  });
  const grossContributionEstimate = (invoiced || labourRevenue + partsRevenue) - (labourRevenue * 0.45 + partsCost);

  const advisor: AtlasOverview["advisor"] = [];
  if (overdueServices) advisor.push({ severity: "attention", title: `${overdueServices} service programme${overdueServices === 1 ? " is" : "s are"} overdue`, detail: "Prioritise booking these machines before additional hours accumulate.", href: "/service-programmes" });
  if (dueSoonServices) advisor.push({ severity: "opportunity", title: `${dueSoonServices} service${dueSoonServices === 1 ? " is" : "s are"} forecast soon`, detail: "These are opportunities to pre-book workshop capacity and contact customers early.", href: "/service-programmes" });
  if (overdueInvoices.length) advisor.push({ severity: "attention", title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, detail: "Review outstanding balances and payment reminders.", href: "/invoices" });
  if (repeatedIssues.length) advisor.push({ severity: "attention", title: `${repeatedIssues.length} recurring failure pattern${repeatedIssues.length === 1 ? "" : "s"} detected`, detail: "Review repeat issues across similar makes/models and consider proactive inspections.", href: "/intelligence" });
  if (grossContributionEstimate > 0) advisor.push({ severity: "info", title: "Positive estimated workshop contribution", detail: "Atlas estimates positive gross contribution from recorded invoice, labour and parts data. Treat labour cost as an operational estimate until payroll costing is configured.", href: "/reports" });
  if (!advisor.length) advisor.push({ severity: "info", title: "No immediate exceptions detected", detail: "Atlas will surface service, profitability and repeat-failure opportunities as more operational history is recorded." });

  return {
    generatedAt: new Date().toISOString(),
    profitability: {
      invoiced,
      labourRevenue,
      labourCostEstimate: labourRevenue * 0.45,
      partsRevenue,
      partsCost,
      grossContributionEstimate,
      topJobs,
    },
    fleet: {
      machines: machines.length,
      openJobs,
      overdueServices,
      dueSoonServices,
      recurringIssueGroups: repeatedIssues.length,
      repeatedIssues,
    },
    servicePredictions: servicePredictions.slice(0, 20),
    advisor,
  };
}
