import { NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthenticatedUserContext();
  if (!context?.companyId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("company_settings")
    .select("company_name, primary_colour, logo_path")
    .eq("company_id", context.companyId).maybeSingle();
  if (error) {
    console.error("QR branding lookup failed", error);
    return NextResponse.json({ error: "Unable to load branding." }, { status: 500 });
  }
  let logoUrl: string | null = null;
  if (data?.logo_path) {
    const { data: signed, error: signingError } = await supabase.storage
      .from("company-branding").createSignedUrl(data.logo_path, 3600);
    if (!signingError) logoUrl = signed?.signedUrl ?? null;
  }
  const colour = typeof data?.primary_colour === "string" && /^#[0-9a-fA-F]{6}$/.test(data.primary_colour)
    ? data.primary_colour : "#103D2E";
  return NextResponse.json({
    companyId: context.companyId,
    name: data?.company_name || "Your company",
    colour, logoUrl,
  }, { headers: { "Cache-Control": "no-store" } });
}
