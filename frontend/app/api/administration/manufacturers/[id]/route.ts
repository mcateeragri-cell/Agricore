import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function text(value: unknown, max = 1000) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

export async function PUT(request: NextRequest, routeContext: RouteContext) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!context.permissions.includes("service_templates.manage")) return NextResponse.json({ error: "You do not have permission to manage manufacturers." }, { status: 403 });

  const { id } = await routeContext.params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }

  const name = text(body.name, 120);
  if (!name) return NextResponse.json({ error: "Manufacturer name is required." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("manufacturers").update({
    name,
    website: text(body.website, 300),
    notes: text(body.notes, 1000),
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("company_id", context.companyId).select("id, name, website, notes, is_active").maybeSingle();

  if (error) return NextResponse.json({ error: error.code === "23505" ? "A manufacturer with this name already exists." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  if (!data) return NextResponse.json({ error: "Manufacturer not found." }, { status: 404 });
  return NextResponse.json({ manufacturer: data });
}

export async function DELETE(_request: NextRequest, routeContext: RouteContext) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!context.permissions.includes("service_templates.manage")) return NextResponse.json({ error: "You do not have permission to manage manufacturers." }, { status: 403 });

  const { id } = await routeContext.params;
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase.from("manufacturers").delete({ count: "exact" }).eq("id", id).eq("company_id", context.companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Manufacturer not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
