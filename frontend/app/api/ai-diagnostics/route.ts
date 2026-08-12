import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { loadOrBuildAtlasMachineContext } from "@/lib/atlas/context-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiagnoseBody = {
  machineId?: unknown;
  symptoms?: unknown;
  faultCodes?: unknown;
  extraContext?: unknown;
};

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function canUseAi(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return (
    auth.platformRole === "super_admin" ||
    auth.platformRole === "platform_admin" ||
    auth.role === "company_admin" ||
    auth.role === "administrator" ||
    auth.permissions.includes("ai_diagnostics.use")
  );
}

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractOutputText(body: OpenAIResponse) {
  const values: string[] = [];
  for (const item of body.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) values.push(content.text);
    }
  }
  return values.join("\n").trim();
}

function formatHistoryFallback(context: {
  machineLabel: string;
  symptoms: string;
  faultCodes: string;
  pastJobs: Array<Record<string, unknown>>;
  parts: Array<Record<string, unknown>>;
}) {
  const recurring = context.pastJobs
    .filter((job) => job.diagnosis || job.fault_reported || job.work_carried_out)
    .slice(0, 5)
    .map((job) => `• ${job.job_number || "Previous job"}: ${job.diagnosis || job.fault_reported || job.work_carried_out}`)
    .join("\n");

  const parts = context.parts
    .slice(0, 8)
    .map((part) => `• ${part.part_number || "Part"} ${part.description || ""}`.trim())
    .join("\n");

  return [
    `Workshop intelligence for ${context.machineLabel}`,
    "",
    `Symptoms: ${context.symptoms || "Not supplied"}`,
    context.faultCodes ? `Fault codes: ${context.faultCodes}` : "",
    "",
    "Relevant previous history:",
    recurring || "• No comparable repair history is recorded for this machine yet.",
    "",
    "Parts previously used on this machine:",
    parts || "• No parts history is available yet.",
    "",
    "OpenAI is not configured, so this result is based on AgriCore history only. Add OPENAI_API_KEY to enable AI diagnostic reasoning.",
  ].filter(Boolean).join("\n");
}

async function authorise() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!canUseAi(auth)) return { error: NextResponse.json({ error: "AI Diagnostics permission is required." }, { status: 403 }) } as const;

  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, "ai_diagnostics");
  if (!enabled) return { error: NextResponse.json({ error: "AI Diagnostics is not enabled for this subscription." }, { status: 403 }) } as const;
  return { auth, admin, error: null } as const;
}

export async function GET() {
  const access = await authorise();
  if (access.error) return access.error;
  const { auth, admin } = access;

  const { data, error } = await admin
    .from("machines")
    .select(`
      id, make, model, registration, serial_number, hours, year, machine_type,
      customers ( business_name, contact_name )
    `)
    .eq("company_id", auth.companyId)
    .order("make", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const machines = (data ?? []).map((machine: any) => {
    const customer = Array.isArray(machine.customers) ? machine.customers[0] : machine.customers;
    return {
      id: machine.id,
      label: [machine.make, machine.model].filter(Boolean).join(" ") || "Unnamed machine",
      identifier: machine.registration || machine.serial_number || "",
      customer: customer?.business_name || customer?.contact_name || "",
      hours: machine.hours,
      year: machine.year,
    };
  });

  return NextResponse.json({
    machines,
    providerConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6",
  });
}

export async function POST(request: NextRequest) {
  const access = await authorise();
  if (access.error) return access.error;
  const { auth, admin } = access;

  let body: DiagnoseBody;
  try { body = (await request.json()) as DiagnoseBody; }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }

  const machineId = text(body.machineId, 100);
  const symptoms = text(body.symptoms, 5000);
  const faultCodes = text(body.faultCodes, 1500);
  const extraContext = text(body.extraContext, 3000);

  if (!machineId || !symptoms) {
    return NextResponse.json({ error: "Choose a machine and describe the symptoms." }, { status: 400 });
  }

  const { data: machine, error: machineError } = await admin
    .from("machines")
    .select("id,customer_id,make,model,machine_type,year,registration,serial_number,hours,usage_profile")
    .eq("id", machineId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (machineError) return NextResponse.json({ error: machineError.message }, { status: 500 });
  if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 });

  const cachedContext = await loadOrBuildAtlasMachineContext(admin, auth.companyId, machineId, 60);
  if (!cachedContext) return NextResponse.json({ error: "Machine context could not be prepared." }, { status: 404 });

  const pastJobs = cachedContext.previousJobs ?? [];
  const customer = cachedContext.customer as any;
  const machineLabel = [machine.make, machine.model].filter(Boolean).join(" ") || "Unnamed machine";
  const contextPayload = {
    machine: cachedContext.machine,
    symptoms,
    faultCodes,
    extraContext,
    customer: customer ? { businessName: customer.business_name, contactName: customer.contact_name } : null,
    previousJobs: pastJobs,
    previousParts: cachedContext.previousParts ?? [],
    previousLabour: cachedContext.previousLabour ?? [],
    similarFleetMachines: cachedContext.similarFleetMachines ?? [],
    similarFleetJobs: cachedContext.similarFleetJobs ?? [],
    activeServiceProgrammes: cachedContext.activeServiceProgrammes ?? [],
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      providerConfigured: false,
      model: null,
      answer: formatHistoryFallback({ machineLabel, symptoms, faultCodes, pastJobs, parts: cachedContext.previousParts ?? [] }),
      historyCount: pastJobs.length,
    });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6";
  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      instructions: [
        "You are AgriCore Service Intelligence, an advisory assistant for qualified agricultural machinery technicians.",
        "Use the company-provided machine history, similar-fleet repair history, service programmes, labour and parts evidence. Never claim access to manufacturer manuals, wiring diagrams, service bulletins or proprietary specifications unless they are explicitly present in the supplied context.",
        "Prioritise safe diagnostic sequencing: verify complaint, check obvious mechanical/electrical basics, isolate the system, then propose measurements/tests.",
        "Do not instruct the user to defeat safety systems. Flag steps that require isolation, depressurisation, lifting support, stored-energy control, high-voltage precautions or manufacturer procedures.",
        "Clearly separate: likely causes, recommended checks in order, evidence from this machine, evidence from similar machines in this company, service implications, possible parts/tools, and when manufacturer information is required.",
        "Be concise and practical. Do not invent fault-code meanings or torque/pressure specifications. If a specification is unknown, say to verify it in the correct manufacturer information.",
      ].join(" "),
      input: `Diagnose this workshop case using only the supplied AgriCore context plus general mechanical reasoning.\n\n${JSON.stringify(contextPayload, null, 2)}`,
    }),
  });

  const responseBody = (await openAIResponse.json()) as OpenAIResponse;
  if (!openAIResponse.ok) {
    console.error("OpenAI diagnostics request failed:", responseBody.error);
    return NextResponse.json({ error: responseBody.error?.message || "AI diagnostics request failed." }, { status: 502 });
  }

  const answer = extractOutputText(responseBody);
  if (!answer) return NextResponse.json({ error: "The AI provider returned no diagnostic text." }, { status: 502 });

  return NextResponse.json({
    providerConfigured: true,
    model,
    answer,
    historyCount: pastJobs.length,
  });
}
