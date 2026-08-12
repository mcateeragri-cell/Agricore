AgriCore Project Atlas — Phase 1 Background Engine
===================================================

AUDIT-FIRST IMPLEMENTATION
This package was built from AgriCore-Atlas-Phase1-Upload.zip and extends the Atlas
features already present in that exact project. It does NOT add duplicate Intelligence,
AI Diagnostics, automation, dashboard or machine-intelligence pages.

WHAT THIS RELEASE ADDS

1. ATLAS BACKGROUND EVENT QUEUE
- Existing atlas_events remain the event source.
- New atlas_queue receives captured events automatically in PostgreSQL.
- Queue claiming uses FOR UPDATE SKIP LOCKED so two workers do not process the same task.
- Failed work is retried up to five times with a delay.
- Interrupted running tasks can be safely requeued.
- Completed queue history is retained for 30 days by the worker.

2. BACKGROUND INTELLIGENCE SNAPSHOTS
- Atlas builds and stores the existing workshop/fleet/profitability/service overview.
- /api/atlas/overview uses a fresh background snapshot when available.
- If no current snapshot exists, the live request safely rebuilds and persists one.
- No machine health score/status is created.

3. WORKFLOW AUTOMATION BACKGROUND EXECUTION
- Existing automation rules are reused.
- Automation evaluation has been moved into one reusable Atlas executor.
- The scheduled worker evaluates enabled rules after rebuilding company intelligence.
- Alerts that are no longer true are automatically resolved rather than remaining open forever.

4. AI CONTEXT CACHE
- Atlas can prebuild machine workshop context from:
  machine/customer data, previous jobs, parts, labour, service programmes and similar
  same-make/model machines belonging to the same company.
- AI Diagnostics now consumes that cache when fresh and rebuilds it when needed.
- This avoids duplicating AI context gathering in multiple places.
- No cross-tenant data is included.

5. BACKGROUND WORKER
New route:
/api/atlas/worker

- Vercel Cron processes the shared queue automatically once per hour.
- CRON_SECRET / AGRICORE_CRON_SECRET secures scheduled calls.
- Company administrators may manually run Atlas, but manual runs are restricted to the
  active company and cannot trigger processing for another tenant.

6. ADMINISTRATION -> ATLAS HEALTH
New page:
/administration/atlas

Shows for the active company:
- queued work
- running work
- failed work
- captured event count
- cached AI contexts
- latest intelligence snapshot
- scheduled-worker configuration

Platform administrators additionally see recent platform processing-run summaries.
Company administrators do not receive cross-company run information.

7. PRODUCTION CRON
vercel.json adds:
/api/atlas/worker -> 0 * * * *

The existing trial-reminder cron is retained.

DATABASE MIGRATION — REQUIRED
Run in Supabase BEFORE starting the new build:

supabase/migrations/20260812_012_atlas_background_engine.sql

The migration adds:
- processing state to atlas_events
- atlas_queue
- atlas_intelligence_snapshots
- atlas_ai_context_cache
- atlas_processing_runs
- queue trigger for captured events
- safe queue claim RPC
- stale-lock recovery RPC

It does not replay the entire historic event table. Existing events older than seven days
are marked processed; recent unprocessed events are queued so Atlas starts with useful
current context without generating a huge first-run backlog.

ENVIRONMENT VARIABLES
No new secrets are introduced.

Atlas background scheduling uses the CRON_SECRET already introduced for production cron jobs.
Ensure production Vercel has:
CRON_SECRET=<existing secure value>

AI Diagnostics continues to use the existing optional:
OPENAI_API_KEY
OPENAI_MODEL

INSTALL
Extract this ZIP over:
C:\projects\Agricore\frontend

Then run:

taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

ACCEPTANCE TEST

1. Run migration 20260812_012_atlas_background_engine.sql.
2. Build AgriCore successfully.
3. Open Administration -> Atlas Health.
4. Confirm the page loads for a company administrator.
5. Create or edit a test job.
6. Return to Atlas Health and confirm queued work appears.
7. Click "Run Atlas now".
8. Confirm queued work falls and completed work increases.
9. Open Intelligence and confirm it loads normally.
10. Confirm a current intelligence snapshot timestamp appears in Atlas Health.
11. Open AI Diagnostics and run a test against a machine with history.
12. Return to Atlas Health and confirm AI context cache count is non-zero.
13. Add/enable an existing Atlas automation rule and manually run Atlas.
14. Confirm matching alerts appear under Intelligence.
15. Change the underlying condition so it no longer matches, rerun Atlas, and confirm the
    stale alert resolves.
16. Test a second company and confirm Atlas Health queue numbers are company-specific.
17. Deploy to Vercel and confirm the new Atlas cron appears alongside trial reminders.

VALIDATION PERFORMED HERE
- Audited the exact uploaded Phase 1 project before changing it.
- Reused existing Atlas event capture, intelligence calculations, automation rules,
  feature entitlements and AI Diagnostics.
- Syntax/transpile checked all 12 changed/new TypeScript/TSX source files successfully.
- Full Next.js production build must be run locally because the clean upload excludes node_modules.

FILES IN THIS OVERLAY
- lib/atlas/automation-executor.ts
- lib/atlas/snapshots.ts
- lib/atlas/context-cache.ts
- lib/atlas/processor.ts
- app/api/atlas/worker/route.ts
- app/api/atlas/health/route.ts
- app/api/atlas/automations/run/route.ts
- app/api/atlas/overview/route.ts
- app/api/ai-diagnostics/route.ts
- app/administration/atlas/page.tsx
- Components/atlas/AtlasHealthClient.tsx
- Components/navigation/navigation-data.ts
- supabase/migrations/20260812_012_atlas_background_engine.sql
- vercel.json
