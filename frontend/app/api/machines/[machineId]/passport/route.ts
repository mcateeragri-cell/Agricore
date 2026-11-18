import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params;
  if (!UUID.test(machineId)) return NextResponse.json({ error: "Invalid machine ID." }, { status: 400 });
  const context = await getAuthenticatedUserContext();
  if (!context?.companyId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!context.permissions.includes("machines.edit") && !context.permissions.includes("settings.manage")) {
    return NextResponse.json({ error: "You do not have permission to issue machine stickers." }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const machine = await supabase.from("machines").select("id,company_id")
    .eq("id", machineId).eq("company_id", context.companyId).maybeSingle();
  if (machine.error) return NextResponse.json({ error: "Unable to verify machine." }, { status: 500 });
  if (!machine.data) return NextResponse.json({ error: "Machine not found." }, { status: 404 });
  const admin = createSupabaseAdmin();
  const existing = await admin.from("machine_public_passports").select("token,enabled")
    .eq("machine_id", machineId).eq("company_id", context.companyId).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "Passport table unavailable. Apply the database migration." }, { status: 500 });
  let token = existing.data?.token;
  if (existing.data && !existing.data.enabled) {
    return NextResponse.json({ error: "Public passport is disabled for this machine." }, { status: 403 });
  }
  if (!token) {
    const created = await admin.from("machine_public_passports").upsert({ machine_id: machineId, company_id: context.companyId }, { onConflict: "machine_id", ignoreDuplicates: true });
    if (created.error) return NextResponse.json({ error: "Unable to initialise passport." }, { status: 500 });
    const lookup = await admin.from("machine_public_passports").select("token,enabled")
      .eq("machine_id", machineId).eq("company_id", context.companyId).single();
    if (lookup.error || !lookup.data?.enabled) return NextResponse.json({ error: "Unable to load passport." }, { status: 500 });
    token = lookup.data.token;
  }
  const url = new URL(`/passport/${token}`, request.nextUrl.origin).toString();
  return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
}
