import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OnboardingUpdate = {
  currentStep?: unknown;
  businessDetailsComplete?: unknown;
  invoiceSettingsComplete?: unknown;
  paymentSettingsComplete?: unknown;
  teamSetupComplete?: unknown;
  completed?: unknown;
};

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stepValue(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6
    ? parsed
    : undefined;
}

export async function GET() {
  const context = await requirePermission(["settings.manage"]);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_onboarding")
    .select("*")
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data) {
    return NextResponse.json({ onboarding: data });
  }

  const { data: created, error: createError } = await supabase
    .from("company_onboarding")
    .insert({ company_id: context.companyId })
    .select("*")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ onboarding: created });
}

export async function PATCH(request: NextRequest) {
  const context = await requirePermission(["settings.manage"]);
  const body = (await request.json()) as OnboardingUpdate;
  const completed = booleanValue(body.completed);

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const currentStep = stepValue(body.currentStep);
  if (currentStep !== undefined) update.current_step = currentStep;

  const businessDetailsComplete = booleanValue(body.businessDetailsComplete);
  if (businessDetailsComplete !== undefined) {
    update.business_details_complete = businessDetailsComplete;
  }

  const invoiceSettingsComplete = booleanValue(body.invoiceSettingsComplete);
  if (invoiceSettingsComplete !== undefined) {
    update.invoice_settings_complete = invoiceSettingsComplete;
  }

  const paymentSettingsComplete = booleanValue(body.paymentSettingsComplete);
  if (paymentSettingsComplete !== undefined) {
    update.payment_settings_complete = paymentSettingsComplete;
  }

  const teamSetupComplete = booleanValue(body.teamSetupComplete);
  if (teamSetupComplete !== undefined) {
    update.team_setup_complete = teamSetupComplete;
  }

  if (completed !== undefined) {
    update.completed_at = completed ? new Date().toISOString() : null;
    if (completed) update.current_step = 6;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_onboarding")
    .upsert(
      {
        company_id: context.companyId,
        ...update,
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ onboarding: data });
}
