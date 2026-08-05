import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canView(permissions: string[]) {
  return ["service_templates.view", "service_templates.manage", "service_templates.approve"].some((permission) => permissions.includes(permission));
}
function canManage(permissions: string[]) { return permissions.includes("service_templates.manage"); }
function text(value: unknown, max = 2000) { if (typeof value !== "string") return null; return value.trim().slice(0, max) || null; }
function number(value: unknown) { if (value === null || value === undefined || value === "") return null; const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : null; }
function checklist(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).map((item, index) => {
    const record = typeof item === "object" && item ? item as Record<string, unknown> : {};
    return { id: text(record.id, 100) ?? `item-${index + 1}`, label: text(record.label, 300) ?? "Checklist item", required: record.required !== false };
  }).filter((item) => item.label !== "Checklist item" || value.length === 1);
}

export async function GET() {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!canView(context.permissions)) return NextResponse.json({ error: "You do not have permission to view service templates." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_templates").select("id, name, description, model_pattern, interval_hours, interval_months, status, is_active, manufacturer_id, checklist_items, manufacturers(name)").eq("company_id", context.companyId).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedUserContext();
  if (!context) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!canManage(context.permissions)) return NextResponse.json({ error: "You do not have permission to manage service templates." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  const name = text(body.name, 160); if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });
  const requestedStatus = body.status === "approved" || body.status === "archived" ? body.status : "draft";
  if (requestedStatus === "approved" && !context.permissions.includes("service_templates.approve")) return NextResponse.json({ error: "You do not have permission to approve templates." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_templates").insert({ company_id: context.companyId, manufacturer_id: text(body.manufacturer_id, 100), name, description: text(body.description), model_pattern: text(body.model_pattern, 200), interval_hours: number(body.interval_hours), interval_months: number(body.interval_months), checklist_items: checklist(body.checklist_items), status: requestedStatus, is_active: typeof body.is_active === "boolean" ? body.is_active : true, created_by: context.userId, approved_by: requestedStatus === "approved" ? context.userId : null, approved_at: requestedStatus === "approved" ? new Date().toISOString() : null }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "A service template with this name already exists." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
