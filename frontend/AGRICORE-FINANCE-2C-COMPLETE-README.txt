AgriCore Platform Pack 2C — completion build
============================================

This build extends the uploaded Finance 2D source rather than replacing existing Atlas Finance foundations.

Included:
- Existing Pack 2C tax rate history, tax periods, finance validation and controlled journal reversals retained.
- Effective tax calculation helper with tax-inclusive/exclusive rounding.
- Full/partial credit-note workflow linked to the original invoice.
- Database protections against cross-company credit notes and over-crediting.
- Credit-note Atlas event capture and Atlas Queue finance posting.
- Double-entry credit-note posting to receivables, revenue and tax payable.
- Finance Dashboard: cash, receivables, overdue debt, revenue, expenses, profit, tax liability, credits and validation issues.
- Accountant Workspace: date-filtered trial balance, journal explorer, tax summary and CSV trial-balance export.
- Navigation entries for Finance Dashboard and Accountant Workspace.
- Issued invoices now expose a Create credit note action.

Database migration to run in Supabase SQL Editor:
  supabase/migrations/20260812_016_atlas_finance_pack_2c_complete.sql

Verification note:
The uploaded ZIP did not contain a complete runnable dependency installation, so `next build` could not start because the Next binary was absent. All 13 changed TypeScript/TSX files passed a TypeScript transpiler syntax check. On the local project, run:
  npm install
  npm run build

Then run the new migration and deploy normally.
