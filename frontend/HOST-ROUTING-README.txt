AgriCore custom-domain routing
==============================

Production behaviour
--------------------
getagricore.com
  Public marketing website.

www.getagricore.com
  Redirects to getagricore.com (preserves path/query).

app.getagricore.com
  AgriCore application/authentication domain.
  Visiting / redirects to /dashboard.

Marketing-domain app/auth URLs such as /login, /signup and /dashboard are
redirected to app.getagricore.com with the path and query string preserved.
Marketing pages requested on app.getagricore.com are redirected to the root
marketing domain.

API routes are not host-redirected. This avoids disrupting Stripe webhooks,
Supabase callbacks, or other integrations that may still target an existing
production URL.

Required Vercel production settings
-----------------------------------
NEXT_PUBLIC_APP_URL=https://app.getagricore.com

If/when NEXT_PUBLIC_MARKETING_URL is used by the app, set:
NEXT_PUBLIC_MARKETING_URL=https://getagricore.com

Also update external services that use callback URLs:
- Stripe Checkout/Customer Portal return URLs should resolve under app.getagricore.com
  via NEXT_PUBLIC_APP_URL.
- Supabase Auth redirect allow-list should include app.getagricore.com URLs.
- Keep the Stripe production webhook endpoint configured and verified.

Localhost and Vercel preview deployments retain existing single-host behaviour.
