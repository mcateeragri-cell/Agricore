AgriCore v1.0 Public Demo Launch Hotfix

WHAT THIS FIXES
The marketing /demo route was listed as a marketing route in proxy.ts but was not included in Supabase middleware PUBLIC_ROUTE_PREFIXES. Unauthenticated prospects were therefore redirected to /login?redirectTo=/demo.

THIS PATCH
1. Makes /demo and the other marketing pages (/about, /security, /blog, /cookies) explicitly public in the session middleware.
2. Keeps app.getagricore.com reserved for authenticated product routes; proxy.ts will continue redirecting app.getagricore.com/demo to getagricore.com/demo.
3. Replaces the old static demo page with an interactive, read-only browser demo.
4. The public demo uses hard-coded synthetic display data only. It does NOT query Supabase, does NOT create a session, and cannot access, modify, delete or send any customer/company data.
5. Adds public Resend webhook/trial-reminder API paths to the public-route allowlist so auth middleware cannot interfere with provider/server callbacks.

NO SQL MIGRATION REQUIRED.
NO ENVIRONMENT VARIABLE CHANGES REQUIRED.

INSTALL
Extract over:
C:\projects\Agricore\frontend

Then run:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

If the build passes:
cd C:\projects\Agricore
git add frontend/app/demo/page.tsx frontend/Components/marketing/public-demo.tsx frontend/utils/supabase/middleware.ts
git commit -m "Add public read-only product demo"
git push origin main

PRODUCTION TEST
1. Open an InPrivate/Incognito window.
2. Visit https://getagricore.com/demo directly.
3. It must NOT redirect to login.
4. Click Dashboard, Customers, Machines, Jobs, Invoices and Reports inside the demo.
5. Confirm the data is synthetic and controls are read-only.
6. Visit https://app.getagricore.com/demo. It should canonicalise to https://getagricore.com/demo rather than showing login.
7. Test Start free trial from the demo page.

SECURITY NOTE
This intentionally does not expose a real demo tenant or service-role API to anonymous visitors. It is a static interactive product showcase, which is safer for the commercial launch while still giving prospects a realistic click-through experience.
