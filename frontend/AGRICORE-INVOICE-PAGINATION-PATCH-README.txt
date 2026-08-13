AgriCore Invoice Pagination + Job Completion RLS Patch
=======================================================

Extract this ZIP over:
C:\projects\Agricore\frontend

Changes:
1. Invoice PDF notes now start higher on the page.
2. Long invoice notes automatically continue onto a new invoice page.
3. Continued pages are headed "Notes (continued)".
4. Footers/page numbers retain safe bottom clearance.
5. Payment terms spacing is tightened to reclaim usable invoice space.
6. Migration 024 records the manager/admin job-completion RLS fix in source control.

Migration:
supabase/migrations/20260813_024_job_completion_manager_rls.sql

If you already ran the manager RLS policy manually in Supabase, migration 024 is safe to run:
it drops/recreates that named policy idempotently.

Build:
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test:
- Preview the invoice that previously clipped at the bottom.
- Confirm all notes are visible.
- Add a deliberately long note and confirm a second PDF page is generated.
- Confirm footer and Page X of Y remain visible.
