import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

export type AtlasMachineContext = {
  machine: AnyRow;
  customer: AnyRow | null;
  previousJobs: AnyRow[];
  previousParts: AnyRow[];
  previousLabour: AnyRow[];
  similarFleetMachines: AnyRow[];
  similarFleetJobs: AnyRow[];
  activeServiceProgrammes: AnyRow[];
};

export async function buildAtlasMachineContext(
  admin: SupabaseClient,
  companyId: string,
  machineId: string,
): Promise<AtlasMachineContext | null> {
  const { data: machine, error: machineError } = await admin
    .from("machines")
    .select("id,customer_id,make,model,machine_type,year,registration,serial_number,hours,usage_profile")
    .eq("id", machineId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (machineError) throw new Error(machineError.message);
  if (!machine) return null;

  const [customerResult, jobsResult, similarMachinesResult, serviceProgrammesResult] = await Promise.all([
    machine.customer_id
      ? admin.from("customers").select("business_name,contact_name").eq("id", machine.customer_id).eq("company_id", companyId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("jobs")
      .select("id,job_number,status,fault_reported,diagnosis,work_carried_out,opened_date,completed_date,engineer_name")
      .eq("company_id", companyId)
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("machines")
      .select("id,make,model,year,hours,registration,serial_number")
      .eq("company_id", companyId)
      .ilike("make", String(machine.make || ""))
      .ilike("model", String(machine.model || ""))
      .neq("id", machineId)
      .limit(25),
    admin.from("machine_service_programmes")
      .select("last_service_hours,last_service_date,active,service_programmes(name,interval_hours,interval_months)")
      .eq("company_id", companyId)
      .eq("machine_id", machineId)
      .eq("active", true),
  ]);

  const firstError = customerResult.error || jobsResult.error || similarMachinesResult.error || serviceProgrammesResult.error;
  if (firstError) throw new Error(firstError.message);

  const previousJobs = (jobsResult.data ?? []) as AnyRow[];
  const similarFleetMachines = (similarMachinesResult.data ?? []) as AnyRow[];
  const similarMachineIds = similarFleetMachines.map((item) => item.id);

  const similarJobsResult = similarMachineIds.length
    ? await admin.from("jobs")
        .select("id,machine_id,job_number,status,fault_reported,diagnosis,work_carried_out,opened_date,completed_date,engineer_name")
        .eq("company_id", companyId)
        .in("machine_id", similarMachineIds)
        .order("created_at", { ascending: false })
        .limit(40)
    : { data: [], error: null } as any;

  if (similarJobsResult.error) throw new Error(similarJobsResult.error.message);

  const jobIds = previousJobs.map((job) => job.id);
  const [partsResult, labourResult] = jobIds.length
    ? await Promise.all([
        admin.from("job_parts_used")
          .select("job_id,part_number,description,quantity,notes")
          .eq("company_id", companyId)
          .in("job_id", jobIds)
          .limit(80),
        admin.from("job_labour_entries")
          .select("job_id,engineer_name,hours,description")
          .eq("company_id", companyId)
          .in("job_id", jobIds)
          .limit(80),
      ])
    : [{ data: [], error: null }, { data: [], error: null }] as any;

  const historyError = partsResult.error || labourResult.error;
  if (historyError) throw new Error(historyError.message);

  return {
    machine: machine as AnyRow,
    customer: (customerResult.data as AnyRow | null) ?? null,
    previousJobs,
    previousParts: (partsResult.data ?? []) as AnyRow[],
    previousLabour: (labourResult.data ?? []) as AnyRow[],
    similarFleetMachines,
    similarFleetJobs: (similarJobsResult.data ?? []) as AnyRow[],
    activeServiceProgrammes: (serviceProgrammesResult.data ?? []) as AnyRow[],
  };
}

export async function refreshAtlasMachineContext(
  admin: SupabaseClient,
  companyId: string,
  machineId: string,
) {
  const context = await buildAtlasMachineContext(admin, companyId, machineId);
  if (!context) return null;

  const { error } = await admin.from("atlas_ai_context_cache").upsert(
    {
      company_id: companyId,
      entity_type: "machine",
      entity_id: machineId,
      context,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,entity_type,entity_id" },
  );
  if (error) throw new Error(error.message);
  return context;
}

export async function loadOrBuildAtlasMachineContext(
  admin: SupabaseClient,
  companyId: string,
  machineId: string,
  maxAgeMinutes = 60,
) {
  const { data, error } = await admin
    .from("atlas_ai_context_cache")
    .select("context,generated_at")
    .eq("company_id", companyId)
    .eq("entity_type", "machine")
    .eq("entity_id", machineId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data?.context && data.generated_at) {
    const age = Date.now() - new Date(data.generated_at).getTime();
    if (Number.isFinite(age) && age <= maxAgeMinutes * 60_000) {
      return data.context as AtlasMachineContext;
    }
  }

  return refreshAtlasMachineContext(admin, companyId, machineId);
}
