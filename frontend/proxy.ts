import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const MARKETING_HOST = "getagricore.com";
const WWW_HOST = "www.getagricore.com";
const APP_HOST = "app.getagricore.com";

const MARKETING_PATH_PREFIXES = [
  "/features",
  "/pricing",
  "/contact",
  "/demo",
  "/about",
  "/security",
  "/blog",
  "/cookies",
  "/privacy",
  "/terms",
];

const APP_PATH_PREFIXES = [
  "/dashboard",
  "/customers",
  "/machines",
  "/jobs",
  "/dispatch",
  "/calendar",
  "/quotes",
  "/invoices",
  "/stock",
  "/reports",
  "/service-programmes",
  "/ai-diagnostics",
  "/administration",
  "/settings",
  "/office",
  "/technician",
  "/platform",
  "/select-company",
  "/onboarding",
  "/unauthorised",
  "/help",
  "/account",
];

const APP_AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
];

function getHostname(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const rawHost = forwardedHost || request.headers.get("host") || "";

  return rawHost.split(":")[0].trim().toLowerCase();
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToHost(
  request: NextRequest,
  hostname: string,
  pathname = request.nextUrl.pathname,
) {
  const url = request.nextUrl.clone();

  url.protocol = "https:";
  url.hostname = hostname;
  url.port = "";
  url.pathname = pathname;

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const hostname = getHostname(request);
  const pathname = request.nextUrl.pathname;

  // Canonical public website URL.
  if (hostname === WWW_HOST) {
    if (
      matchesPrefix(pathname, APP_PATH_PREFIXES) ||
      matchesPrefix(pathname, APP_AUTH_PREFIXES)
    ) {
      return redirectToHost(request, APP_HOST);
    }

    return redirectToHost(request, MARKETING_HOST);
  }

  // app.getagricore.com is reserved for the signed-in product and auth flow.
  if (hostname === APP_HOST) {
    if (pathname === "/") {
      return redirectToHost(request, APP_HOST, "/dashboard");
    }

    if (matchesPrefix(pathname, MARKETING_PATH_PREFIXES)) {
      return redirectToHost(request, MARKETING_HOST);
    }

    return updateSession(request);
  }

  // getagricore.com is the public marketing site. App/auth URLs are canonical
  // on app.getagricore.com. API routes are deliberately left on the host that
  // received them so Stripe/Supabase callbacks and webhooks are not disturbed.
  if (hostname === MARKETING_HOST) {
    if (
      matchesPrefix(pathname, APP_PATH_PREFIXES) ||
      matchesPrefix(pathname, APP_AUTH_PREFIXES)
    ) {
      return redirectToHost(request, APP_HOST);
    }

    return updateSession(request);
  }

  // Localhost, Vercel preview domains and the legacy Vercel production URL keep
  // the existing single-host behaviour so development and rollback stay safe.
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
