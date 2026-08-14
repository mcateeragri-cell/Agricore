AgriCore Workshop Operations Suite — Pack 2A: Workflow Engine
==============================================================

Extract over:
C:\projects\Agricore\frontend

Requires Workshop Operations Pack 1 + migration 032.

Adds:
- configurable company workshop workflow
- Administration > Workshop Workflow
- safe AgriCore status mapping for compatibility
- job_workflow_states
- audited job_workflow_events
- automatic backfill of existing jobs
- dynamic workflow lanes on /workshop
- drag/drop job movement between workflow stages
- stage movement still respects company/module/role/depot scope

Default stages:
Booked -> Scheduled -> Diagnosis -> Waiting Parts -> Repair -> Quality Check -> Manager Review -> Ready to Invoice

Migration:
supabase/migrations/20260814_033_workshop_workflow_engine.sql

No environment variables.

Build:
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test:
1. Administration > Workshop Workflow.
2. Rename/reorder one stage and save.
3. Open /workshop and confirm lane order follows settings.
4. Drag a test job from Diagnosis to Waiting Parts.
5. Confirm jobs.status becomes waiting_parts.
6. Drag it back to Repair and confirm jobs.status becomes in_progress.
7. Confirm Dispatch/Calendar/Technician still work.

Pack 2B will add stage requirements: Waiting Parts controls, QC checklist, Manager Approval and Warranty Review.
