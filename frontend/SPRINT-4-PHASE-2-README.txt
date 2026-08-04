AgriCore Sprint 4 - Service Programmes Phase 2

Scope
- One active service programme per machine
- Dashboard service-due summary: overdue, today, this week, within 50 hours
- Machine service health/status with hours remaining and predicted due date
- Create a service job from the machine programme
- Record a completed service and advance the next interval
- Service completion records added to the machine timeline
- No confidence indicator and no next-action banner

Install
1. Run supabase/migrations/20260803_service_programmes_phase2.sql in Supabase SQL Editor.
2. Extract this ZIP into C:\projects\Agricore\frontend and overwrite matching files.
3. Run:
   Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
4. Start locally with npm.cmd run dev.

Testing
- Assign one programme to a machine.
- Confirm a second active programme cannot be assigned.
- Change machine usage hours/week and confirm predicted due date changes.
- Create a service job and confirm customer, machine, service name and checklist are carried into the job record.
- Record a completed service and confirm the machine timeline shows it.
- Switch companies and confirm no service data carries across.
