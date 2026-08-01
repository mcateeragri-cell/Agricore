import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseServerConfiguration() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured.",
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } =
    getSupabaseServerConfiguration();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },

      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            for (const {
              name,
              value,
              options,
            } of cookiesToSet) {
              cookieStore.set(name, value, {
                ...options,
                sameSite:
                  options.sameSite ?? "lax",
                secure:
                  options.secure ??
                  process.env.NODE_ENV ===
                    "production",
              });
            }
          } catch {
            /*
             * Server Components cannot always write cookies.
             * The AgriCore middleware refreshes the session and
             * writes any updated authentication cookies instead.
             */
          }
        },
      },
    },
  );
}