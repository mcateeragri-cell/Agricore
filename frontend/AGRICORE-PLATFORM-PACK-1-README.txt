AgriCore Platform Pack 1 — Core Services Standardisation

PURPOSE
This is the first architecture pack built from the latest master project ZIP.
It does not add customer-facing features. It standardises the shared services that
future Atlas Finance, Intelligence and Enterprise work will depend on.

AUDIT-FIRST FINDINGS
The master project already had:
- Atlas event capture in Postgres
- Atlas background queue + worker
- Atlas snapshots and AI context cache
- Data Management audit trail
- Company/platform role and permission context

Those systems are reused. This pack does NOT create a second queue, audit table,
event table or permission model.

WHAT CHANGED
1. New lib/platform/core shared service layer:
   - authorisation.ts
   - audit.ts
   - events.ts
   - queue.ts
   - index.ts

2. Atlas processor now uses the shared queue service for:
   - task claiming
   - completion
   - retry/failure handling
   - retention cleanup

3. Atlas worker, Atlas Health and Atlas Automations now use one shared company-admin
authorisation helper instead of repeating the same role logic.

4. Administration -> Data Management now writes through the shared audit service
instead of maintaining its own audit-writing implementation.

5. Architecture Decision Record added:
   docs/architecture/ADR-001-platform-core-services.md

NO SQL MIGRATION REQUIRED.
NO NEW ENVIRONMENT VARIABLES.
NO NEW NPM DEPENDENCIES.

INSTALL
Extract over:
C:\projects\Agricore\frontend

THEN RUN
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

ACCEPTANCE TEST
1. Build completes successfully.
2. Administration -> Atlas Health loads normally.
3. Click Run Atlas now; queue processing still completes.
4. Create/edit a test job; confirm Atlas event/queue activity still appears.
5. Administration -> Data Management:
   - archive a disposable stock item OR perform another safe test action
   - confirm Audit Log still records the action.
6. Atlas Automation rules can still be viewed/edited by company admins.
7. Technician/non-admin permissions are unchanged.

NEXT PACK
Atlas Finance Foundation will build on these shared services rather than creating
parallel financial event/queue/audit infrastructure.
