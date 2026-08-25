import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, type CompanyRole } from "@/lib/auth/require-permission";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { DEFAULT_MFA_REQUIRED_ROLES, isPlatformMfaRequired } from "@/lib/auth/mfa-policy";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES: CompanyRole[] = ["company_admin","administrator","service_manager","office","parts_manager","parts_advisor","sales_manager","salesperson","technician","apprentice","read_only"];

export async function GET() {
  const auth = await getAuthenticatedUserContext({ skipMfaEnforcement: true });
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("company_mfa_policies").select("required_roles,updated_at").eq("company_id", auth.companyId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const requiredRoles = (Array.isArray(data?.required_roles) ? data.required_roles : DEFAULT_MFA_REQUIRED_ROLES).filter((role): role is CompanyRole => ALLOWED_ROLES.includes(role as CompanyRole));
  return NextResponse.json({
    requiredRoles, companyRequired: auth.role ? requiredRoles.includes(auth.role) : false, platformRequired: isPlatformMfaRequired(auth.platformRole),
    requiredForCurrentUser: auth.mfaRequired, canManagePolicy: auth.role === "company_admin" || auth.platformRole === "super_admin" || auth.platformRole === "platform_admin",
    role: auth.role, platformRole: auth.platformRole, assuranceLevel: auth.assuranceLevel, mfaEnrolled: auth.mfaEnrolled,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUserContext({ skipMfaEnforcement: true });
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(auth.role === "company_admin" || auth.platformRole === "super_admin" || auth.platformRole === "platform_admin")) return NextResponse.json({ error: "Company Administrator access is required." }, { status: 403 });
  if (auth.mfaEnrolled && auth.assuranceLevel !== "aal2") return NextResponse.json({ error: "Verify your two-factor code before changing the company MFA policy." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requested: unknown[] = Array.isArray(body.requiredRoles) ? body.requiredRoles : [];
  const requiredRoles = requested.filter(
    (role): role is CompanyRole =>
      typeof role === "string" && ALLOWED_ROLES.includes(role as CompanyRole),
  );
  if (!requiredRoles.includes("company_admin")) requiredRoles.unshift("company_admin");
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("company_mfa_policies").upsert({ company_id: auth.companyId, required_roles: requiredRoles, updated_by: auth.userId, updated_at: new Date().toISOString() }, { onConflict: "company_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, requiredRoles });
}
