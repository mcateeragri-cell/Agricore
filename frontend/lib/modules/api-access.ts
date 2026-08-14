import "server-only";

import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { isCompanyFeatureEnabled } from "@/lib/platform/effective-features";
import { MODULE_BY_KEY } from "@/lib/modules/registry";

export async function requireApiModule(featureKey: string) {
  const auth = await getAuthenticatedUserContext();

  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const enabled = await isCompanyFeatureEnabled(admin, auth.companyId, featureKey);

  if (!enabled) {
    const module = MODULE_BY_KEY.get(featureKey);
    return NextResponse.json(
      { error: `${module?.name || "This module"} is disabled for this company.`, code: "MODULE_DISABLED" },
      { status: 403 },
    );
  }

  return null;
}
