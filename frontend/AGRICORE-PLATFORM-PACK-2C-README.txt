AgriCore Platform Pack 2C — Global Tax Engine & Validation

WHAT THIS PACK ADDS
- Company-scoped global tax settings foundation.
- Effective-dated tax-code rate history.
- Tax reporting periods with Open -> Prepared -> Reviewed -> Locked workflow.
- Finance validation service and Administration UI.
- Controlled, idempotent journal reversal RPC.
- Atlas reversal of unpaid accrual invoices when they are voided.
- Finance capability permissions (view/manage/tax/reports/post).
- Audit records for tax-code changes, tax-period changes and manual journal reversals.
- Architecture decision record explaining the global tax design.

IMPORTANT FINANCIAL SCOPE
This is accounting/tax preparation infrastructure, not statutory filing software.
AgriCore intentionally does NOT seed current VAT/GST/Sales Tax rates, filing deadlines,
or country-specific legal rules. Those values change and must come from verified company
configuration or future jurisdiction/government connectors.

Pack 2C does NOT submit anything to HMRC, Revenue, ATO, IRS or another authority.

DATABASE MIGRATION
Run first in Supabase SQL Editor:
  supabase/migrations/20260812_015_atlas_finance_tax_validation.sql

INSTALL
Extract this ZIP over:
  C:\projects\Agricore\frontend

Then run:
  taskkill /F /IM node.exe
  Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
  npm.cmd run build
  npm.cmd run dev -- --webpack

ACCEPTANCE TEST
1. Open Administration -> Finance.
2. Confirm the Finance Foundation from Packs 2A/2B still loads.
3. Create a test tax code with an effective date.
4. Refresh and confirm the code appears.
5. Create a test tax period with valid start/end dates.
6. Move it Open -> Prepared -> Reviewed -> Locked.
7. Click Run validation; confirm no false errors on a clean ledger.
8. Send a test accrual invoice and run Atlas; confirm invoice_issued journal posts.
9. Void that UNPAID invoice and run Atlas; confirm a reversing journal is created and the original journal becomes reversed.
10. Do NOT use void to reverse a paid/part-paid invoice. Pack 2C deliberately rejects that path until refund/credit settlement workflow is recorded.
11. Confirm existing Jobs, Invoices, Stock, Atlas and Reports still operate normally.

TYPECHECK NOTE
Changed/new TypeScript files were syntax/transpile checked with TypeScript 5.8.3.
The local Next.js production build remains the final full-project validation.

NEXT PACK
Platform Pack 2D will build the accountant-facing workspace and review outputs on top of
this ledger/tax/validation foundation: Trial Balance, P&L groundwork, tax-preparation
summaries and accountant export/review tools. Direct government submission remains later.
