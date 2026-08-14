AgriCore Workshop Operations Suite — Pack 1
==============================================

Extract over:
C:\projects\Agricore\frontend

Built against:
AgriCore-Latest-20260814-230423.zip

What was reused
---------------
This pack deliberately DOES NOT rebuild:
- Dispatch scheduling
- Dispatch drag/drop assignment logic
- Calendar scheduling/clash checks
- Technician field workflow
- Branch/depot permissions
- Modular platform enforcement

Those existing systems remain the source of truth.

What this adds
--------------
1. New optional module: Workshop Operations
   - Professional + Enterprise
   - Starter remains disabled
   - Company can switch the module off in Administration > Modules

2. /workshop
   - Workshop capacity view
   - Technician loading %
   - Scheduled hours vs workday capacity
   - Drag an existing scheduled job card between technicians to reassign it
     using the EXISTING Dispatch API
   - Urgent/emergency lane
   - Waiting parts lane
   - In-progress lane
   - Unscheduled jobs lane
   - Open Jobs / Urgent / Waiting Parts / In Progress / Review / Load KPIs
   - Branch/depot-aware through the existing active depot context

3. /workshop/tv
   - Full-screen live workshop board
   - Auto refresh
   - Technician workload
   - Current scheduled work
   - Suitable for a workshop office / large TV

4. company_workshop_settings
   - workday_hours (default 8)
   - overload_percent (default 100)
   - tv_refresh_seconds (default 30)

Migration
---------
Run after migration 031:
supabase/migrations/20260814_032_workshop_operations_suite.sql

Expected:
Success. No rows returned

No environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
1. Professional/Enterprise company: Administration > Modules.
2. Confirm Workshop Operations appears and is enabled by entitlement.
3. Open Workshop from Operations navigation.
4. Confirm current depot jobs/technicians load.
5. Drag one scheduled assignment onto a different technician.
6. Confirm Dispatch reflects the same technician change.
7. Open /workshop/tv and leave it open long enough to see auto refresh.
8. Switch depot and confirm Workshop follows the selected depot.
9. Disable Workshop Operations and confirm /workshop is blocked and nav disappears.

Next pack
---------
Pack 2 should add:
- configurable workflow stages/status mapping
- manager approval / quality-check / warranty-review stages
- waiting-parts controls directly from the workshop board
- role dashboard Workshop widget
