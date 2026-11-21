import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { canSeeNotification, allowedBranch } from "@/lib/notifications/access";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noCache = { "Cache-Control": "no-store" };
export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth?.companyId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: events, error } = await admin.from("agricore_notification_events")
    .select("id,company_id,branch_id,category,source_id,title,detail,priority,created_at")
    .eq("company_id", auth.companyId).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Notification database unavailable. Apply migration 005." }, { status: 503 });
  const visible = (events ?? []).filter(e => canSeeNotification(auth, e.category) && allowedBranch(auth, e.branch_id));
  const ids = visible.map(e => e.id);
  const reads = ids.length ? await admin.from("agricore_notification_reads").select("event_id").eq("user_id", auth.userId).in("event_id", ids) : { data: [], error: null };
  if (reads.error) return NextResponse.json({ error: "Unable to load notification state" }, { status: 500 });
  const seen = new Set((reads.data ?? []).map(r => r.event_id));
  return NextResponse.json({ notifications: visible.map(e => ({ ...e, read: seen.has(e.id), href: e.category === "website_enquiry" ? "/enquiries" : "/machines" })), unread: visible.filter(e => !seen.has(e.id)).length }, { headers: noCache });
}
export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUserContext();
  if (!auth?.companyId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let input: { id?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data: event } = await admin.from("agricore_notification_events").select("id,category,branch_id").eq("id", input.id).eq("company_id", auth.companyId).maybeSingle();
  if (!event || !canSeeNotification(auth, event.category) || !allowedBranch(auth, event.branch_id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await admin.from("agricore_notification_reads").upsert({ event_id: event.id, user_id: auth.userId }, { onConflict: "event_id,user_id" });
  return error ? NextResponse.json({ error: "Unable to mark read" }, { status: 500 }) : NextResponse.json({ ok: true }, { headers: noCache });
}
