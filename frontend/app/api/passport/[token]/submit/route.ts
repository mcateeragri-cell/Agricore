import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { UUID, ipDigest, verifyPin } from "@/lib/passport/operator-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12_000;
const fail = (error: string, status: number) => NextResponse.json(
  { error }, { status, headers: { "Cache-Control": "no-store" } },
);

async function readLimitedJson(req: NextRequest): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("INVALID_JSON");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
  return parsed as Record<string, unknown>;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) return fail("Invalid passport", 404);

  let body: Record<string, unknown>;
  try { body = await readLimitedJson(req); }
  catch (error) { return fail(error instanceof Error && error.message === "TOO_LARGE" ? "Submission too large" : "Invalid JSON", error instanceof Error && error.message === "TOO_LARGE" ? 413 : 400); }

  const { pin, kind, operatorName, description, severity } = body;
  if (typeof pin !== "string" || !/^[0-9]{6,10}$/.test(pin)) return fail("Invalid PIN", 400);
  if (kind !== "hours" && kind !== "daily_check" && kind !== "breakdown") return fail("Invalid record type", 400);
  if (typeof operatorName !== "string" || operatorName.trim().length < 2 || operatorName.length > 100) return fail("Enter operator name (2–100 characters)", 400);

  let hours: number | null = null;
  let checks: Record<string, string> | null = null;
  if (kind === "hours" || kind === "daily_check") {
    if (typeof body.hours !== "number" || !Number.isFinite(body.hours) || body.hours < 0 || body.hours > 9999999 || Math.abs(body.hours * 10 - Math.round(body.hours * 10)) > 1e-7) return fail("Enter valid hours (one decimal maximum)", 400);
    hours = body.hours;
  }
  if (kind === "daily_check") {
    if (!body.checks || typeof body.checks !== "object" || Array.isArray(body.checks)) return fail("Complete the checklist", 400);
    const keys = ["oil", "coolant", "hydraulics", "tyres", "lights", "brakes"];
    const raw = body.checks as Record<string, unknown>;
    if (Object.keys(raw).length !== keys.length || !keys.every(k => raw[k] === "pass" || raw[k] === "fail")) return fail("Complete all six checks", 400);
    checks = Object.fromEntries(keys.map(k => [k, String(raw[k])]));
    if (Object.values(checks).includes("fail") && (typeof description !== "string" || description.trim().length < 5)) return fail("Describe any failed checks", 400);
  }
  if (kind === "breakdown" && (typeof description !== "string" || description.trim().length < 10)) return fail("Describe the breakdown (at least 10 characters)", 400);
  if (description !== undefined && (typeof description !== "string" || description.length > 2000)) return fail("Description too long", 400);
  const chosenSeverity = kind === "breakdown" ? severity : "low";
  if (chosenSeverity !== "low" && chosenSeverity !== "medium" && chosenSeverity !== "high" && chosenSeverity !== "critical") return fail("Invalid severity", 400);

  const admin = createSupabaseAdmin();
  const { data: passport, error: passportError } = await admin.from("machine_public_passports")
    .select("machine_id,company_id").eq("token", token).eq("enabled", true).maybeSingle();
  if (passportError) return fail("Passport unavailable", 503);
  if (!passport) return fail("Passport unavailable", 404);
  const { data: company, error: companyError } = await admin.from("companies")
    .select("id").eq("id", passport.company_id).eq("is_active", true).maybeSingle();
  if (companyError) return fail("Verification unavailable", 503);
  if (!company) return fail("Passport unavailable", 404);

  // On Vercel, x-vercel-forwarded-for is set by the platform. Never use an
  // arbitrary user-supplied address as an authentication decision by itself.
  // Machine-wide limits in the SQL function remain effective across IP changes.
  const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  let digest: string;
  try { digest = ipDigest(ip); }
  catch { return fail("Verification unavailable", 503); }

  // Atomic database reservation protects against concurrent PIN guesses.
  const { data: attemptId, error: reservationError } = await admin.rpc("passport_reserve_pin_attempt", {
    p_machine_id: passport.machine_id, p_ip_digest: digest,
  });
  if (reservationError) return fail("Verification unavailable. Apply the security migration.", 503);
  if (attemptId === null || attemptId === undefined) return fail("Too many attempts. Try again later", 429);

  const { data: settings, error: settingsError } = await admin.from("machine_operator_settings")
    .select("pin_hash").eq("machine_id", passport.machine_id).eq("company_id", passport.company_id).maybeSingle();
  if (settingsError) return fail("Verification unavailable", 503);
  if (!settings || !verifyPin(pin, settings.pin_hash)) return fail("Incorrect operator PIN or PIN not configured", 403);

  // Mark a verified attempt as successful so routine use does not consume the
  // failed-PIN allowance. If this update fails, fail closed.
  const { error: verifiedError } = await admin.from("machine_operator_attempts")
    .update({ verified: true }).eq("id", attemptId).eq("machine_id", passport.machine_id);
  if (verifiedError) return fail("Verification unavailable", 503);

  // Separate rate limit for *valid* submissions (prevents spam with a known PIN).
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [machineCount, ipCount] = await Promise.all([
    admin.from("machine_operator_submissions").select("id", { count: "exact", head: true })
      .eq("machine_id", passport.machine_id).gte("created_at", since),
    admin.from("machine_operator_submissions").select("id", { count: "exact", head: true })
      .eq("machine_id", passport.machine_id).eq("ip_digest", digest).gte("created_at", since),
  ]);
  if (machineCount.error || ipCount.error) return fail("Verification unavailable", 503);
  if ((machineCount.count ?? 0) >= 100 || (ipCount.count ?? 0) >= 20) return fail("Too many submissions. Try again later", 429);

  const { error } = await admin.from("machine_operator_submissions").insert({
    machine_id: passport.machine_id, company_id: passport.company_id,
    kind, operator_name: operatorName.trim(), hours, checks,
    description: typeof description === "string" ? description.trim() : null,
    severity: chosenSeverity, ip_digest: digest,
  });
  if (error) return fail("Unable to save record", 500);
  return NextResponse.json({ ok: true, message: "Record submitted for company review" }, { headers: { "Cache-Control": "no-store" } });
}
