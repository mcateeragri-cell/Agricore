import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/auth",
  "/api/payments/revolut/webhook",
];

const PUBLIC_EXACT_ROUTES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
]);

function isPublicRoute(pathname: string) {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isApiRoute(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicRoute = isPublicRoute(pathname);

  let response = NextResponse.next({ request });

  try {
    const { url, anonKey } = getSupabaseEnvironment();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("Unable to refresh the current session:", userError);
    }

    if (!user && !publicRoute) {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: "You must be signed in to use this endpoint." },
          { status: 401 },
        );
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set(
        "redirectTo",
        `${pathname}${request.nextUrl.search}`,
      );

      return NextResponse.redirect(loginUrl);
    }

    if (user && pathname === "/login") {
      const requestedRedirect =
        request.nextUrl.searchParams.get("redirectTo") ?? "/";

      const safeRedirect =
        requestedRedirect.startsWith("/") &&
        !requestedRedirect.startsWith("//")
          ? requestedRedirect
          : "/";

      return NextResponse.redirect(
        new URL(safeRedirect, request.url),
      );
    }

    return response;
  } catch (error) {
    console.error("AgriCore session middleware failed:", error);

    if (publicRoute) {
      return response;
    }

    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 503 },
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "error",
      "Authentication is temporarily unavailable.",
    );

    return NextResponse.redirect(loginUrl);
  }
}