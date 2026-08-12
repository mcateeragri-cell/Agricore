AgriCore Platform Pack 2A — Atlas Finance Foundation

WHAT THIS PACK DOES
- Adds a global company financial profile.
- Adds company-scoped chart of accounts.
- Adds finance periods and period-lock status model.
- Adds jurisdiction-neutral tax codes.
- Adds double-entry journal header/line schema foundation.
- Adds Administration -> Finance Foundation.
- Adds API/service types for finance configuration.
- Adds RLS for company isolation.
- Seeds existing companies from their current Regional Settings.
- Adds a universal starter chart and starter tax codes.
- Documents global-first finance architecture.

WHAT IT DELIBERATELY DOES NOT DO YET
- No existing invoice/purchase/job automatically posts to the ledger yet.
- No VAT/GST/Sales Tax return is submitted or presented as filing-ready.
- No P&L/Balance Sheet is generated yet.
- No HMRC/ATO/IRS connector is enabled.
- No accounting package integration is enabled.

REQUIRED SQL
supabase/migrations/20260812_013_atlas_finance_foundation.sql

INSTALL
1. Run the SQL migration in Supabase.
2. Extract this ZIP over C:\projects\Agricore\frontend.
3. Run:
   taskkill /F /IM node.exe
   Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
   npm.cmd run dev -- --webpack

TEST
1. Open Administration -> Finance Foundation.
2. Confirm country/currency/tax label were seeded from company Regional Settings.
3. Confirm the starter chart of accounts and STANDARD/ZERO/EXEMPT tax codes appear.
4. Change the financial year start and accounting method; save and refresh.
5. Switch company and confirm finance settings are isolated per company.
6. Confirm normal Jobs/Invoices/Stock workflows are unchanged.

NEXT PACK
Platform Pack 2B will add the posting service, balanced journal validation, idempotent source-event mapping and Atlas queue integration. Only then will operational invoices/purchases begin feeding the ledger.
