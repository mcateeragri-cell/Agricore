import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { sendCompanyEmail } from "@/lib/communications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.CRON_SECRET?.trim() || process.env.AGRICORE_CRON_SECRET?.trim() || "";
  if (!expected || supplied !== expected) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const now = new Date();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const results: Array<{ companyId: string; days: number; sent: boolean; error?: string }> = [];

  for (const days of [7, 2] as const) {
    const targetStart = new Date(start); targetStart.setUTCDate(targetStart.getUTCDate() + days);
    const targetEnd = new Date(end); targetEnd.setUTCDate(targetEnd.getUTCDate() + days);
    const { data: subscriptions, error } = await admin.from("company_subscriptions")
      .select("company_id,trial_ends_at,status")
      .eq("status", "trial")
      .gte("trial_ends_at", targetStart.toISOString())
      .lt("trial_ends_at", targetEnd.toISOString());
    if (error) throw new Error(error.message);

    for (const row of subscriptions ?? []) {
      try {
        const [{ data: company }, { data: settings }, { data: member }] = await Promise.all([
          admin.from("companies").select("company_name,billing_mode").eq("id", row.company_id).maybeSingle(),
          admin.from("company_settings").select("email").eq("company_id", row.company_id).maybeSingle(),
          admin.from("company_member_roles").select("user_id").eq("company_id", row.company_id).eq("role", "company_admin").limit(1).maybeSingle(),
        ]);
        if (!company || company.billing_mode !== "subscription") continue;
        let recipient = settings?.email || null;
        if (!recipient && member?.user_id) {
          const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
          recipient = authUser.user?.email || null;
        }
        if (!recipient) continue;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.getagricore.com";
        await sendCompanyEmail({
          companyId: row.company_id,
          to: recipient,
          templateKey: days === 7 ? "trial_ending_7" : "trial_ending_2",
          variables: { company_name: company.company_name, trial_end: new Date(row.trial_ends_at).toLocaleDateString("en-GB"), action_url: `${appUrl}/settings/billing` },
          idempotencyKey: `trial-reminder:${row.company_id}:${days}:${String(row.trial_ends_at).slice(0,10)}`,
        });
        results.push({ companyId: row.company_id, days, sent: true });
      } catch (error) {
        results.push({ companyId: row.company_id, days, sent: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  }
  return NextResponse.json({ success: true, results });
}
