import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const OFFICE_ROLES = [
  "administrator",
  "service_manager",
  "office",
  "admin",
  "manager",
  "owner",
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
              // Some server contexts do not permit cookie writes.
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      fullName: "",
      role: "",
      canReview: false,
      error: "You must be signed in.",
    };
  }

  const [
    { data: profile, error: profileError },
    { data: roleRow, error: roleError },
  ] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("app_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError || roleError) {
    return {
      supabase,
      user,
      fullName: "",
      role: "",
      canReview: false,
      error:
        profileError?.message ??
        roleError?.message ??
        "Unable to load user profile.",
    };
  }

  const role =
    typeof roleRow?.role === "string"
      ? normaliseRole(roleRow.role)
      : "";

  const fullName =
    profile?.full_name ||
    (typeof user.user_metadata
      ?.full_name === "string"
      ? user.user_metadata.full_name
      : "") ||
    user.email?.split("@")[0] ||
    "AgriCore User";

  return {
    supabase,
    user,
    fullName,
    role,
    canReview: OFFICE_ROLES.includes(
      role as (typeof OFFICE_ROLES)[number],
    ),
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

function normaliseRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}