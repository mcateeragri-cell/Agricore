import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_ROLES = [
  "company_admin",
  "administrator",
  "service_manager",
  "office",
  "parts_manager",
  "technician",
  "apprentice",
  "read_only",
] as const;

type CompanyRole = (typeof COMPANY_ROLES)[number];

const PERMISSIONS = [
  "users.view",
  "users.manage_all",
  "users.manage_technicians",
  "roles.manage",
  "settings.manage",
  "service_templates.view",
  "service_templates.manage",
  "service_templates.approve",
  "service_programmes.view",
  "service_programmes.manage",
  "ai_diagnostics.use",
  "customers.edit",
  "machines.edit",
  "jobs.view_all",
  "jobs.assign",
  "jobs.edit",
  "jobs.review",
  "calendar.manage",
  "invoices.view",
  "invoices.manage",
  "sales.view",
  "sales.manage",
  "quotes.view",
  "quotes.manage",
  "stock.view",
  "stock.manage",
  "parts.sales",
  "commercial.view_all",
] as const;

type PermissionKey = (typeof PERMISSIONS)[number];

type SaveBody = {
  role?: unknown;
  permissions?: unknown;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isCompanyRole(value: unknown): value is CompanyRole {
  return typeof value === "string" &&
    (COMPANY_ROLES as readonly string[]).includes(value);
}

function canManageRoles(context: Awaited<ReturnType<typeof getAuthenticatedUserContext>>) {
  if (!context) return false;

  return (
    context.platformRole === "super_admin" ||
    context.platformRole === "platform_admin" ||
    context.role === "company_admin" ||
    context.role === "administrator" ||
    context.permissions.includes("roles.manage")
  );
}

function normalisePermissions(value: unknown): PermissionKey[] {
  if (!Array.isArray(value)) return [];

  const valid = new Set<string>(PERMISSIONS);
  return Array.from(
    new Set(
      value.filter(
        (entry): entry is PermissionKey =>
          typeof entry === "string" && valid.has(entry),
      ),
    ),
  );
}

export async function GET() {
  try {
    const context = await getAuthenticatedUserContext();

    if (!context) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!canManageRoles(context)) {
      return NextResponse.json(
        { error: "You do not have permission to manage roles." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("company_role_permissions")
      .select("role, permission_key, allowed")
      .eq("company_id", context.companyId);

    if (error) throw new Error(error.message);

   const matrix = COMPANY_ROLES.reduce<Record<CompanyRole, string[]>>(
  (result, role) => {
    result[role] = [];
    return result;
  },
  {} as Record<CompanyRole, string[]>,
);

    for (const row of data ?? []) {
      if (
        row.allowed === true &&
        isCompanyRole(row.role) &&
        typeof row.permission_key === "string" &&
        (PERMISSIONS as readonly string[]).includes(row.permission_key)
      ) {
        matrix[row.role].push(row.permission_key);
      }
    }

    // Company administrators always retain full company control.
    matrix.company_admin = [...PERMISSIONS];

    return NextResponse.json({
      company: {
        id: context.companyId,
        name: context.companyName,
      },
      roles: COMPANY_ROLES,
      permissions: PERMISSIONS,
      matrix,
      lockedRoles: ["company_admin"],
    });
  } catch (error) {
    console.error("Unable to load role permissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load role permissions." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthenticatedUserContext();

    if (!context) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!canManageRoles(context)) {
      return NextResponse.json(
        { error: "You do not have permission to manage roles." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as SaveBody;

    if (!isCompanyRole(body.role)) {
      return NextResponse.json({ error: "A valid company role is required." }, { status: 400 });
    }

    if (body.role === "company_admin") {
      return NextResponse.json(
        { error: "Company Administrator permissions are protected and cannot be reduced." },
        { status: 409 },
      );
    }

    const selected = new Set(normalisePermissions(body.permissions));
    const admin = createAdminClient();

    const rows = PERMISSIONS.map((permission) => ({
      company_id: context.companyId,
      role: body.role,
      permission_key: permission,
      allowed: selected.has(permission),
    }));

    const { error } = await admin
      .from("company_role_permissions")
      .upsert(rows, {
        onConflict: "company_id,role,permission_key",
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      role: body.role,
      permissions: Array.from(selected),
      saved: true,
    });
  } catch (error) {
    console.error("Unable to save role permissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save role permissions." },
      { status: 500 },
    );
  }
}
