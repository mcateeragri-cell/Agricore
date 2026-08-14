AgriCore Modular Platform Pack 2 — Role-Specific Dashboards
===========================================================

Extract over:
C:\projects\Agricore\frontend

Built on top of Modular Platform Pack 1 + Pack 1B.

Dashboard inheritance
---------------------
AgriCore system default
    -> Company default
    -> Role default
    -> Personal user layout

If a company disables personal customisation for a role, the personal layer is
ignored and users in that role receive the managed company/role dashboard.

What this adds
--------------
- Administration > Dashboard Layouts
- Company-wide fallback dashboard
- Role-specific dashboard presets for:
  * Company Admin
  * Administrator
  * Service Manager
  * Office
  * Parts Manager
  * Read Only
- Per-role "Allow users to customise" control
- Existing per-user dashboard layouts remain supported
- Users can reset their personal dashboard back to the managed role/company layout
- Dashboard shows whether it is:
  * Your dashboard
  * Role dashboard
  * Company dashboard
  * AgriCore default
- Module-aware widgets remain hidden when their module is disabled
- Financial widgets remain permission-aware
- Technician and Apprentice keep the dedicated field dashboard

Migration
---------
Run after migration 030:
supabase/migrations/20260814_031_role_specific_dashboards.sql

Expected:
Success. No rows returned

No new environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
1. Administration > Dashboard Layouts.
2. Configure Service Manager, hide Revenue Trend, save.
3. Sign in / switch to a Service Manager account and confirm the role layout.
4. Leave personal customisation enabled and customise that user's dashboard.
5. Reset the personal dashboard and confirm it returns to the Service Manager preset.
6. Disable personal customisation for Service Manager.
7. Confirm users in that role see "Managed by company" and cannot customise.
8. Disable a module such as Service Programmes and confirm its dashboard widget stays hidden even if the role preset says visible.
9. Confirm users without financial access never see financial widgets.
