AgriCore UI Refresh 1
=====================

Purpose
-------
Reduce visual/navigation complexity while preserving the full AgriCore feature set.
Advanced Financial Control is packaged as an Enterprise-only module; Professional keeps the day-to-day operational suite including quotes and invoices.

Included
--------
- Compact primary navigation: Dashboard, Jobs, Customers, Machines, Calendar.
- Collapsible Operations, Commercial, Insights, Finance and Administration groups.
- Financial Control grouped as one Enterprise workspace rather than multiple Administration links.
- Enterprise entitlement: financial_control.
- Server-side Finance workspace gate for /administration/finance/*.
- Billing upgrade explanation when a non-Enterprise user tries to open Financial Control.
- Pricing copy updated to distinguish Professional workflow from Enterprise Financial Control.
- Cleaner dashboard top bar.
- Cleaner, compact one-click Quick Actions panel.

Migration
---------
Run:
  supabase/migrations/20260812_021_enterprise_financial_control.sql

Expected result:
  Success. No rows returned

Then clean/build:
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  npm run build

Notes
-----
- Existing URLs remain unchanged; this is an information-architecture/UI change, not a route migration.
- Invoice and quote functionality remains outside the Enterprise Financial Control entitlement.
- Internal/demo billing modes continue receiving all platform features through the existing effective-feature engine.
