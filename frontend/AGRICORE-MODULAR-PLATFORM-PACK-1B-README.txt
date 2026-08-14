AgriCore Modular Platform Pack 1B — Full-App Enforcement
========================================================

Built against:
AgriCore-Latest-20260814-214718.zip

Extract over:
C:\projects\Agricore\frontend

Purpose
-------
Pack 1 created the company-facing module catalogue.
Pack 1B wires that module state through the EXISTING AgriCore application.

Access hierarchy remains:
Subscription entitlement
  -> Company module choice
  -> Role/permission
  -> Depot / finance / job scope
  -> User

What Pack 1B enforces
---------------------
1. Direct page access
   A disabled module no longer opens simply because someone knows the URL.
   A clear Module Disabled screen is shown instead.

2. Server APIs
   Relevant module APIs now fail closed with:
   HTTP 403
   code: MODULE_DISABLED

3. Navigation
   Desktop, administration and mobile navigation respect module state.

4. Global Search
   Disabled Quotes, Invoices and Stock are not searched or returned.
   Global Search itself remains switchable.

5. Dashboard
   Widgets tied to Calendar, Service Programmes, Invoices, Stock and
   AgriCore Intelligence disappear when those modules are disabled.
   Dashboard quick actions no longer link into disabled modules.
   Executive summary queries avoid disabled commercial/stock modules.
   Recent activity avoids Invoice queries when Invoices are disabled.

6. Existing security stays authoritative
   Module switches do NOT grant permissions.
   Existing roles, permissions and branch/finance scopes are still enforced
   after the module check succeeds.

Route groups covered
--------------------
Customers
Machines
Jobs / Technician / Office job workflow
Calendar
Dispatch
Service Programmes + service-template/manufacturer administration
Stock
Quotes
Invoices + invoice PDF/send/payment link APIs
Machinery Sales
Reports
AI Diagnostics
AgriCore Intelligence / Atlas
Financial Control APIs/pages
Branches & Depots / Enterprise depot operations
Communications

No SQL migration.
No new environment variables.

Important model
---------------
Modules are workspace/product configuration, not a replacement for RLS.
Existing Supabase RLS and application permissions remain in place.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
Administration > Modules:

1. Disable Reports.
   - Reports disappears from navigation.
   - /reports displays Module Disabled.
   - /api/reports/export returns 403 MODULE_DISABLED.

2. Disable Stock.
   - Stock disappears.
   - Stock dashboard alerts disappear.
   - /stock displays Module Disabled.
   - /api/stock/inventory returns 403 MODULE_DISABLED.

3. Disable AI Diagnostics.
   - AI navigation disappears.
   - /ai-diagnostics is blocked.
   - /api/ai-diagnostics returns 403 MODULE_DISABLED.

4. Disable Invoices.
   - Invoice navigation/mobile action disappears.
   - invoice dashboard data/actions disappear.
   - invoice APIs return 403 MODULE_DISABLED.

5. Re-enable each module and confirm the existing permissions/depot scope work
   exactly as before.

6. Confirm Starter/Professional cannot enable Enterprise-only modules above
   their subscription entitlement.

Syntax validation
-----------------
All 439 non-declaration TypeScript/TSX files in the assembled project were
transpiled for syntax successfully before packaging.
