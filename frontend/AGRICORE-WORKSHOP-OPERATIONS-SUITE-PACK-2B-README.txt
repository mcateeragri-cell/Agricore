AgriCore Workshop Operations Suite — Pack 2B
================================================

Extract over:
C:\projects\Agricore\frontend

Requires:
- Workshop Operations Pack 1 / migration 032
- Workflow Engine Pack 2A / migration 033

What this adds
--------------
1. Stage controls / workflow gates
Each workflow stage can now use:
- No control
- Waiting Parts gate
- Quality Check gate
- Manager Approval gate
- Warranty Review gate

Each gate can be mandatory or optional.

2. Waiting Parts workspace
From the Workshop board:
- Add stock or manual required parts
- Record quantity
- Record supplier ETA
- Track status:
  Required / Reserved / Ordered / Back order / Available / Received / Waived
- A mandatory Waiting Parts stage will not allow the job to move on until:
  * at least one required part exists, and
  * every required part is Available, Received or Waived

3. Quality Control
Administration > Workshop Workflow now includes a configurable company QC template.
Default checks:
- Fault resolved / repair verified
- No leaks or loose components
- Functional test / test run completed
- Safety guards and covers refitted
- Job notes and parts usage complete

Required QC items must PASS before leaving a mandatory Quality Check stage.

4. Manager Approval
Workshop job controls support:
- Approve
- Reject
- Approval note
A mandatory Manager Approval stage blocks progression until the latest review is Approved.

5. Warranty Review
Per job:
- Manufacturer warranty
- Dealer goodwill
- Internal warranty
- Not warranty
- Manufacturer
- Claim reference
- Claim status
- Expected value
- Reimbursed value
- Notes
A Warranty Review stage can be optional or mandatory.

6. Workshop Board
Every workflow job card now has:
"Parts · QC · Approval · Warranty"
which opens a side panel without leaving the Workshop board.

7. Audit safety
Control changes are added to the existing workshop workflow event history whenever
a workflow state exists.

Migration
---------
Run after migration 033:
supabase/migrations/20260814_034_workshop_stage_controls.sql

Expected:
Success. No rows returned

No environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Recommended smoke test
----------------------
1. Administration > Workshop Workflow.
2. Confirm Waiting Parts, QC and Manager Review have stage controls.
3. Confirm Warranty Review exists in the default workflow but is optional.
4. Edit the QC template and save.
5. Open Workshop and choose a test job.
6. Open "Parts · QC · Approval · Warranty".
7. Move test job into Waiting Parts.
8. Add one required part.
9. Try dragging the job out before marking the part Available/Received:
   expected = blocked.
10. Mark it Available and move job forward.
11. Move into Quality Check.
12. Leave a required check incomplete and try to move forward:
    expected = blocked.
13. Pass all required QC items and move forward.
14. Approve in Manager Review, then move to Ready to Invoice.
15. Test Warranty Review as both:
    - Not warranty
    - Manufacturer warranty

Important
---------
Pack 2B does NOT replace jobs.status. The configurable workflow remains a richer
layer that maps back to safe existing AgriCore statuses, preserving Technician,
Dispatch, Calendar and reporting compatibility.
