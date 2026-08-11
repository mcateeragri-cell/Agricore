import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  COUNTRY_PROFILES,
  normaliseRegionalSettings,
  type MeasurementSystem,
  type TimeFormat,
  type WeekStart,
} from "@/lib/regional-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authContext(requireManage = false) {
  const context = await getAuthenticatedUserContext();
  if (!context) {
    return { context: null, response: NextResponse.json({ error: "You must be signed in." }, { status: 401 }) };
  }
  if (requireManage && !context.permissions.includes("settings.manage")) {
    return { context: null, response: NextResponse.json({ error: "Your account is not authorised to manage company settings." }, { status: 403 }) };
  }
  return { context, response: null };
}

export async function GET() {
  const auth = await authContext();
  if (!auth.context) return auth.response;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("country_code,currency_code,locale,timezone,tax_name,default_tax_rate,date_format,time_format,week_start,measurement_system")
    .eq("company_id", auth.context.companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    settings: normaliseRegionalSettings(data ?? undefined),
    profiles: Object.values(COUNTRY_PROFILES),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await authContext(true);
  if (!auth.context) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  const countryCode = String(body.country_code ?? "GB").toUpperCase();
  const profile = COUNTRY_PROFILES[countryCode] ?? COUNTRY_PROFILES.GB;
  const requestedRate = Number(body.default_tax_rate ?? profile.default_tax_rate);
  const timeFormat: TimeFormat = body.time_format === "12" ? "12" : "24";
  const weekStart: WeekStart = body.week_start === "sunday" || body.week_start === "saturday" ? body.week_start : "monday";
  const measurementSystem: MeasurementSystem = body.measurement_system === "imperial" ? "imperial" : "metric";

  const update = {
    country_code: countryCode,
    currency_code: String(body.currency_code ?? profile.currency_code).toUpperCase().slice(0, 3),
    locale: String(body.locale ?? profile.locale).trim() || profile.locale,
    timezone: String(body.timezone ?? profile.timezone).trim() || profile.timezone,
    tax_name: String(body.tax_name ?? profile.tax_name).trim().slice(0, 40) || profile.tax_name,
    default_tax_rate: Number.isFinite(requestedRate) ? Math.min(100, Math.max(0, requestedRate)) : profile.default_tax_rate,
    date_format: String(body.date_format ?? profile.date_format).trim().slice(0, 30) || profile.date_format,
    time_format: timeFormat,
    week_start: weekStart,
    measurement_system: measurementSystem,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .update(update)
    .eq("company_id", auth.context.companyId)
    .select("country_code,currency_code,locale,timezone,tax_name,default_tax_rate,date_format,time_format,week_start,measurement_system")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Company settings were not found." }, { status: 404 });

  return NextResponse.json({ settings: normaliseRegionalSettings(data) });
}
