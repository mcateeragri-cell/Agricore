AgriCore Sprint 4 - Service Programmes Phase 1

IMPORTANT: Run the SQL migration first in Supabase SQL Editor:
supabase/migrations/20260803_service_programmes_phase1.sql

Then extract this ZIP into C:\projects\Agricore\frontend and overwrite matching files.

Included:
- Light / Medium / Heavy machine usage profile
- Editable estimated hours per week
- Service programme creation page
- Hour- and date-based intervals
- Assign multiple programmes to each machine
- Predicted due dates, hours remaining, due-soon and overdue states
- Company-specific RLS isolation

Build:
Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Test:
1. Create a 600-hour programme from Service Programmes.
2. Open a machine and assign the programme.
3. Edit usage level and estimated weekly hours.
4. Confirm the predicted due date changes.
5. Switch companies and confirm programmes do not carry across.
