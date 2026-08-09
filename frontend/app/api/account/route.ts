import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const user = await requireAuthenticatedUser();

  return NextResponse.json({
    account: {
      fullName: user.fullName,
      email: user.email,
      companyName: user.companyName,
      companyRole: user.role || null,
      platformRole: user.platformRole,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const body = await request.json().catch(() => ({})) as {
    fullName?: unknown;
    newPassword?: unknown;
  };

  const fullName = cleanText(body.fullName);
  const newPassword = cleanText(body.newPassword, 250);

  if (!fullName) {
    return NextResponse.json({ error: "Your full name is required." }, { status: 400 });
  }

  if (newPassword && newPassword.length < 10) {
    return NextResponse.json({ error: "New passwords must be at least 10 characters." }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("company_member_profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("company_id", user.companyId)
    .eq("user_id", user.userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const authUpdate: { data?: Record<string, unknown>; password?: string } = {
    data: { full_name: fullName },
  };
  if (newPassword) authUpdate.password = newPassword;

  const { error: authError } = await supabase.auth.updateUser(authUpdate);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, fullName });
}
