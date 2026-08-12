AgriCore Finance 2E — Bank Reconciliation + Financial Reports
===============================================================

This is an ADDITIVE patch for the current Finance 2E Purchase Ledger build.

Adds:
- /administration/finance/bank
- /administration/finance/reports
- Bank account setup linked to existing finance_accounts
- CSV bank statement import
- Duplicate-resistant bank transaction import
- Manual/suggested matching to posted supplier payments and journals
- Tenant and amount validation for bank matching
- Automatic unmatched / part_matched / matched status refresh
- Profit & Loss
- Balance Sheet
- Cash / receivables / payables summary
- Aged Creditors

Install:
1. Extract this ZIP over C:\projects\Agricore\frontend and allow included files to replace matching files.
2. Run supabase/migrations/20260812_020_finance_bank_reconciliation_controls.sql in the production Supabase project.
3. Delete .next if needed.
4. Run npm run build.
5. Commit/push only after a successful local build.

Important:
Bank reconciliation does not create accounting journals. It matches imported bank transactions against finance activity that has already been posted through Atlas Finance. This avoids duplicate accounting entries.

CSV format:
- Required: Date + Amount, OR Date + Debit/Credit
- Optional: Description, Reference, Balance, Transaction ID
- Accepted dates: YYYY-MM-DD or DD/MM/YYYY
- Positive Amount = money in
- Negative Amount = money out
