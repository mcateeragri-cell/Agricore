import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getAuthenticatedUserContext,
} from "@/lib/auth/require-permission";

const OFFICE_ROLES = [
  "company_admin",
  "administrator",
  "service_manager",
  "office",
] as const;

export async function createOfficeSupabase() {
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

export async function getOfficeAuth() {
  const supabase =
    await createOfficeSupabase();

  const context =
    await getAuthenticatedUserContext();

  if (!context) {
    return {
      supabase,
      user: null,
      userId: "",
      email: "",
      fullName: "",
      platformRole: null,
      companyId: "",
      companyName: "",
      companySlug: "",
      role: "",
      permissions: [] as string[],
      canReview: false,
      error: "You must be signed in.",
    };
  }

  const role = normaliseRole(
    context.role,
  );

  const canReview =
    OFFICE_ROLES.includes(
      role as
        (typeof OFFICE_ROLES)[number],
    ) ||
    context.permissions.includes(
      "jobs.review",
    ) ||
    context.permissions.includes(
      "jobs.edit",
    ) ||
    context.permissions.includes(
      "invoices.view",
    ) ||
    context.permissions.includes(
      "invoices.manage",
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
    platformRole:
      context.platformRole,
    companyId: context.companyId,
    companyName: context.companyName,
    companySlug: context.companySlug,
    role,
    permissions:
      context.permissions,
    canReview,
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

function normaliseRole(
  value: string | null | undefined,
) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}