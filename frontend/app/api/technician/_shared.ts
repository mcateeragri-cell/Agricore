import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";

const MANAGER_ROLES = [
  "company_admin",
  "administrator",
  "service_manager",
  "office",
] as const;

export async function createTechnicianSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            try {
              cookieStore.set(
                name,
                value,
                options,
              );
            } catch {
              /*
               * Some server contexts do not permit
               * cookie writes.
               */
            }
          }
        },
      },
    },
  );
}

export async function getTechnicianAuth() {
  const supabase =
    await createTechnicianSupabase();

  const context =
    await getAuthenticatedUserContext();

  if (!context) {
    return {
      supabase,
      user: null,
      userId: "",
      email: "",
      fullName: "",
      companyId: "",
      companyName: "",
      companySlug: "",
      platformRole: null,
      role: "",
      permissions: [] as string[],
      isManager: false,
      error: "You must be signed in.",
    };
  }

  const role = normaliseStatus(
    context.role,
  );

  const isManager =
    MANAGER_ROLES.includes(
      role as
        (typeof MANAGER_ROLES)[number],
    ) ||
    context.permissions.includes(
      "jobs.view_all",
    ) ||
    context.permissions.includes(
      "jobs.edit",
    ) ||
    context.permissions.includes(
      "jobs.assign",
    );

  return {
    supabase,
    user: {
      id: context.userId,
      email: context.email,
    },
    userId: context.userId,
    email: context.email,
    fullName: context.fullName,
    companyId: context.companyId,
    companyName: context.companyName,
    companySlug: context.companySlug,
    platformRole:
      context.platformRole,
    role,
    permissions:
      context.permissions,
    isManager,
    error: null,
  };
}

export function normaliseStatus(
  value: string | null | undefined,
) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function formatDateInput(
  date: Date,
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateRange(
  dateValue: string,
) {
  const start = new Date(
    `${dateValue}T00:00:00`,
  );

  const next = new Date(start);
  next.setDate(
    next.getDate() + 1,
  );

  return {
    start: start.toISOString(),
    end: next.toISOString(),
  };
}
