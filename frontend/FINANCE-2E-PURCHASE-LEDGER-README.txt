AgriCore Finance 2E - Purchase Ledger UI/API
12 August 2026

This is an additive patch for the currently deployed Finance 2D build.
Do NOT replace your whole project with an older archive.

Included:
- app/administration/finance/purchases/page.tsx
- Components/finance/PurchaseLedgerClient.tsx
- app/api/finance/purchases/route.ts
- app/api/finance/purchases/[id]/route.ts
- app/api/finance/supplier-payments/route.ts
- Components/navigation/navigation-data.ts (adds Purchase Ledger)
- lib/platform/finance/posting.ts (latest corrected posting service)
- supabase/migrations/20260812_019_finance_purchase_ledger_payment_refresh.sql

Install order:
1. Copy the files into the matching paths in your current C:\projects\Agricore\frontend project.
2. Run migration 20260812_019_finance_purchase_ledger_payment_refresh.sql in Supabase SQL Editor.
3. From C:\projects\Agricore\frontend run: npm run build
4. If clean, commit and push to main.
5. Verify /administration/finance/purchases in production.

What it adds:
- Purchase Ledger workspace
- Supplier invoice entry
- Multiple invoice lines
- Finance account allocation per line
- VAT/tax-code allocation per line
- Server-side total calculation
- Save draft / Save & post
- Existing Purchase Order linking
- Outstanding and overdue supplier balances
- Partial/full supplier payment recording
- Optional configured bank account selection
- Atlas Finance posting via the already deployed finance event/queue/journal engine

Migration 019 fixes supplier invoice amount_paid/status recalculation when a supplier payment changes from draft to posted.
