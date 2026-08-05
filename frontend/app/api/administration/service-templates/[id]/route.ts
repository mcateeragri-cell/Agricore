import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
function text(value: unknown, max = 2000) { if (typeof value !== "string") return null; return value.trim().slice(0, max) || null; }
function number(value: unknown) { if (value === null || value === undefined || value === "") return null; const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : null; }
function checklist(value: unknown) { if (!Array.isArray(value)) return []; return value.slice(0, 200).map((item, index) => { const record = typeof item === "object" && item ? item as Record<string, unknown> : {}; return { id: text(record.id, 100) ?? `item-${index + 1}`, label: text(record.label, 300) ?? "Checklist item", required: record.required !== false }; }); }

export async function PUT(request: NextRequest, routeContext: RouteContext) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!context.permissions.includes("service_templates.manage")) return NextResponse.json({ error: "You do not have permission to manage service templates." }, { status: 403 });
  const { id } = await routeContext.params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  const name = text(body.name, 160); if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });
  const requestedStatus = body.status === "approved" || body.status === "archived" ? body.status : "draft";
  if (requestedStatus === "approved" && !context.permissions.includes("service_templates.approve")) return NextResponse.json({ error: "You do not have permission to approve templates." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_templates").update({ manufacturer_id: text(body.manufacturer_id, 100), name, description: text(body.description), model_pattern: text(body.model_pattern, 200), interval_hours: number(body.interval_hours), interval_months: number(body.interval_months), checklist_items: checklist(body.checklist_items), status: requestedStatus, is_active: typeof body.is_active === "boolean" ? body.is_active : true, approved_by: requestedStatus === "approved" ? context.userId : null, approved_at: requestedStatus === "approved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", context.companyId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "A service template with this name already exists." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  if (!data) return NextResponse.json({ error: "Service template not found." }, { status: 404 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_request: NextRequest, routeContext: RouteContext) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!context.permissions.includes("service_templates.manage")) return NextResponse.json({ error: "You do not have permission to manage service templates." }, { status: 403 });
  const { id } = await routeContext.params;
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase.from("service_templates").delete({ count: "exact" }).eq("id", id).eq("company_id", context.companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Service template not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
