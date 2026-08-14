import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { requireApiModule } from "@/lib/modules/api-access";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canManage(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserContext>>>) {
  return auth.platformRole === "super_admin" || auth.platformRole === "platform_admin" || ["company_admin", "administrator", "service_manager"].includes(auth.role) || auth.permissions.includes("settings.manage");
}

export async function GET() {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("company_workshop_qc_items").select("id,label,description,position,required,active").eq("company_id", auth.companyId).eq("active", true).order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [], canManage: canManage(auth) });
}

export async function PUT(request: NextRequest) {
  const gate = await requireApiModule("workshop_operations");
  if (gate) return gate;
  const auth = await getAuthenticatedUserContext();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canManage(auth)) return NextResponse.json({ error: "You do not have permission to manage the QC template." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 40) return NextResponse.json({ error: "Keep between 1 and 40 QC items." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const ids = items.map((item: any) => String(item?.id ?? "").trim()).filter(Boolean);
  let disable = admin.from("company_workshop_qc_items").update({ active: false, updated_at: new Date().toISOString() }).eq("company_id", auth.companyId);
  if (ids.length) disable = disable.not("id", "in", `(${ids.join(",")})`);
  const { error: disableError } = await disable;
  if (disableError) return NextResponse.json({ error: disableError.message }, { status: 500 });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const label = String(item?.label ?? "").trim();
    if (!label) return NextResponse.json({ error: `QC item ${index + 1} needs a label.` }, { status: 400 });
    const payload: Record<string, unknown> = { company_id: auth.companyId, label, description: String(item?.description ?? "").trim() || null, position: index, required: item?.required !== false, active: true, updated_at: new Date().toISOString() };
    const id = String(item?.id ?? "").trim();
    const result = id ? await admin.from("company_workshop_qc_items").update(payload).eq("company_id", auth.companyId).eq("id", id) : await admin.from("company_workshop_qc_items").insert(payload);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return GET();
}
