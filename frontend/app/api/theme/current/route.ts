import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { DEFAULT_COMPANY_THEME } from "@/lib/company-theme";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function safeColour(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.toUpperCase()
    : fallback;
}

export async function GET() {
  const context = await getAuthenticatedUserContext();

  if (!context) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select(
      "sidebar_colour, sidebar_colour_secondary, sidebar_text_colour, sidebar_accent_colour, sidebar_style",
    )
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      theme: {
        sidebarColour: safeColour(
          data?.sidebar_colour,
          DEFAULT_COMPANY_THEME.sidebarColour,
        ),
        sidebarColourSecondary: safeColour(
          data?.sidebar_colour_secondary,
          DEFAULT_COMPANY_THEME.sidebarColourSecondary,
        ),
        sidebarTextColour: safeColour(
          data?.sidebar_text_colour,
          DEFAULT_COMPANY_THEME.sidebarTextColour,
        ),
        sidebarAccentColour: safeColour(
          data?.sidebar_accent_colour,
          DEFAULT_COMPANY_THEME.sidebarAccentColour,
        ),
        sidebarStyle:
          data?.sidebar_style === "solid" ? "solid" : "gradient",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
