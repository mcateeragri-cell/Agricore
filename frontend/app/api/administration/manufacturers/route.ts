import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canView(permissions: string[]) {
  return permissions.includes("service_templates.view") || permissions.includes("service_templates.manage");
}

function canManage(permissions: string[]) {
  return permissions.includes("service_templates.manage");
}

function text(value: unknown, max = 1000) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

export async function GET() {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!canView(context.permissions)) return NextResponse.json({ error: "You do not have permission to view manufacturers." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("manufacturers")
    .select("id, name, website, notes, is_active")
    .eq("company_id", context.companyId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ manufacturers: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!canManage(context.permissions)) return NextResponse.json({ error: "You do not have permission to manage manufacturers." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }

  const name = text(body.name, 120);
  if (!name) return NextResponse.json({ error: "Manufacturer name is required." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("manufacturers").insert({
    company_id: context.companyId,
    name,
    website: text(body.website, 300),
    notes: text(body.notes, 1000),
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    created_by: context.userId,
  }).select("id, name, website, notes, is_active").single();

  if (error) return NextResponse.json({ error: error.code === "23505" ? "A manufacturer with this name already exists." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ manufacturer: data }, { status: 201 });
}
