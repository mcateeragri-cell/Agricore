import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Some server contexts do not permit cookie writes.
            }
          }
        },
      },
    },
  );
}

export async function getTechnicianAuth() {
  const supabase = await createTechnicianSupabase();

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
      isManager: false,
      error: "You must be signed in.",
    };
  }

  const [{ data: profile, error: profileError }, { data: roleRow, error: roleError }] =
    await Promise.all([
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
      isManager: false,
      error: profileError?.message ?? roleError?.message ?? "Unable to load user profile.",
    };
  }

  const role =
    typeof roleRow?.role === "string"
      ? roleRow.role.trim().toLowerCase()
      : "";

  const fullName =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "") ||
    user.email?.split("@")[0] ||
    "AgriCore User";

  return {
    supabase,
    user,
    fullName,
    role,
    isManager: [
      "administrator",
      "service_manager",
      "admin",
      "manager",
      "owner",
    ].includes(role),
    error: null,
  };
}

export function normaliseStatus(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateRange(dateValue: string) {
  const start = new Date(`${dateValue}T00:00:00`);
  const next = new Date(start);
  next.setDate(next.getDate() + 1);

  return {
    start: start.toISOString(),
    end: next.toISOString(),
  };
}