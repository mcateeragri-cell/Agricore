import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_FIELD_OPERATIONS_SETTINGS } from "@/lib/field-operations-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETTINGS_PERMISSION = "settings.manage";
const KEYS = [
  "gpsEnabled",
  "returnJourneyEnabled",
  "dispatchLocationEnabled",
  "automaticStatusEnabled",
  "travelTimeEnabled",
  "travelCostingEnabled",
  "jobTimelineEnabled",
  "technicianSummaryEnabled",
] as const;

function canManage(permissions: string[]) {
  return permissions.includes(SETTINGS_PERMISSION);
}

export async function GET(): Promise<NextResponse> {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_field_operations_settings")
    .select("*")
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = data ? {
    gpsEnabled: data.gps_enabled,
    returnJourneyEnabled: data.return_journey_enabled,
    dispatchLocationEnabled: data.dispatch_location_enabled,
    automaticStatusEnabled: data.automatic_status_enabled,
    travelTimeEnabled: data.travel_time_enabled,
    travelCostingEnabled: data.travel_costing_enabled,
    jobTimelineEnabled: data.job_timeline_enabled,
    technicianSummaryEnabled: data.technician_summary_enabled,
  } : DEFAULT_FIELD_OPERATIONS_SETTINGS;

  return NextResponse.json({ settings, canManage: canManage(context.permissions) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!canManage(context.permissions)) return NextResponse.json({ error: "You do not have permission to manage field operations settings." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 }); }

  const booleanValue = (key: typeof KEYS[number], fallback: boolean) =>
    typeof body[key] === "boolean" ? body[key] as boolean : fallback;

  const settings = {
    gpsEnabled: booleanValue("gpsEnabled", true),
    returnJourneyEnabled: booleanValue("returnJourneyEnabled", true),
    dispatchLocationEnabled: booleanValue("dispatchLocationEnabled", false),
    automaticStatusEnabled: booleanValue("automaticStatusEnabled", true),
    travelTimeEnabled: booleanValue("travelTimeEnabled", true),
    travelCostingEnabled: booleanValue("travelCostingEnabled", false),
    jobTimelineEnabled: booleanValue("jobTimelineEnabled", true),
    technicianSummaryEnabled: booleanValue("technicianSummaryEnabled", false),
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_field_operations_settings")
    .upsert({
      company_id: context.companyId,
      gps_enabled: settings.gpsEnabled,
      return_journey_enabled: settings.returnJourneyEnabled,
      dispatch_location_enabled: settings.dispatchLocationEnabled,
      automatic_status_enabled: settings.automaticStatusEnabled,
      travel_time_enabled: settings.travelTimeEnabled,
      travel_costing_enabled: settings.travelCostingEnabled,
      job_timeline_enabled: settings.jobTimelineEnabled,
      technician_summary_enabled: settings.technicianSummaryEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, settings: data });
}
