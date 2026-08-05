import type { SupabaseClient } from "@supabase/supabase-js";

export type FieldOperationsSettings = {
  gpsEnabled: boolean;
  returnJourneyEnabled: boolean;
  dispatchLocationEnabled: boolean;
  automaticStatusEnabled: boolean;
  travelTimeEnabled: boolean;
  travelCostingEnabled: boolean;
  jobTimelineEnabled: boolean;
  technicianSummaryEnabled: boolean;
};

export const DEFAULT_FIELD_OPERATIONS_SETTINGS: FieldOperationsSettings = {
  gpsEnabled: true,
  returnJourneyEnabled: true,
  dispatchLocationEnabled: false,
  automaticStatusEnabled: true,
  travelTimeEnabled: true,
  travelCostingEnabled: false,
  jobTimelineEnabled: true,
  technicianSummaryEnabled: false,
};

export async function loadFieldOperationsSettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FieldOperationsSettings> {
  const { data, error } = await supabase
    .from("company_field_operations_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_FIELD_OPERATIONS_SETTINGS;

  return {
    gpsEnabled: data.gps_enabled ?? true,
    returnJourneyEnabled: data.return_journey_enabled ?? true,
    dispatchLocationEnabled: data.dispatch_location_enabled ?? false,
    automaticStatusEnabled: data.automatic_status_enabled ?? true,
    travelTimeEnabled: data.travel_time_enabled ?? true,
    travelCostingEnabled: data.travel_costing_enabled ?? false,
    jobTimelineEnabled: data.job_timeline_enabled ?? true,
    technicianSummaryEnabled: data.technician_summary_enabled ?? false,
  };
}
