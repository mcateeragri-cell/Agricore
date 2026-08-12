AgriCore Platform Pack 2B — Atlas Finance Ledger & Journal Engine

WHAT THIS PACK ADDS
- Atomic double-entry journal posting RPC
- Source/action idempotency and source-event traceability
- Database-level invoice lifecycle capture (works for UI changes and payment webhooks)
- Dedicated Atlas `finance_posting` queue tasks
- Background posting processor isolated from normal Atlas intelligence work
- Accrual accounting:
  * issued invoice -> Dr Trade Receivables / Cr revenue + tax payable
  * customer receipt -> Dr Bank / Cr Trade Receivables
- Cash accounting:
  * invoice issue does not recognise income
  * customer receipt -> Dr Bank / Cr revenue + tax payable, allocated proportionally for partial receipts
- Revenue split by labour / parts / travel-callout / other invoice item types
- Company currency, open-period and account/tax-code validation
- Financial lock on line items, tax rate and issue date after an invoice is issued
- Finance Foundation page now shows recent journals and pending/failed finance queue work
- ADR documenting the posting architecture

IMPORTANT SCOPE
- This pack does NOT submit VAT/GST/Sales Tax returns.
- It does NOT yet post supplier purchases.
- It does NOT automatically reverse a financially-issued invoice when voided. A void event is deliberately stopped and surfaced as a failed finance task until Pack 2C provides controlled credit/reversal journals. This is safer than silently corrupting the ledger.
- Existing historic invoices are NOT bulk-posted automatically. Only lifecycle changes after the migration create finance events. Historic opening balances/import comes later as a controlled workflow.

REQUIRED MIGRATION
supabase/migrations/20260812_014_atlas_finance_ledger_engine.sql

INSTALL
1. Run the migration in Supabase.
2. Extract this ZIP over C:\projects\Agricore\frontend
3. Run:
   taskkill /F /IM node.exe
   Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
   npm.cmd run dev -- --webpack

ACCEPTANCE TEST — ACCRUAL COMPANY
1. Administration -> Finance Foundation: confirm accounting method = Accrual and there is an open period covering today.
2. Create a small draft invoice with at least one line item and tax.
3. Confirm no journal exists while it remains Draft.
4. Send the invoice (or set it to Sent).
5. Open Administration -> Atlas Health and run Atlas now, or wait for the worker.
6. Open Administration -> Finance Foundation and confirm an `invoice issued` journal appears.
7. Attempt to edit line items/tax/issue date on the sent invoice: AgriCore should block the financial edit.
8. Mark the invoice Paid (or complete a Revolut test payment).
9. Run Atlas again and confirm a `customer payment ...` journal appears.
10. Confirm the finance queue has no failed items.

ACCEPTANCE TEST — CASH COMPANY
1. Use a disposable test company and set accounting method = Cash.
2. Create/send an invoice and run Atlas: no invoice-issue revenue journal should be created.
3. Record payment and run Atlas.
4. Confirm a cash-basis payment journal appears with Bank debit and revenue/tax credits.

IDEMPOTENCY TEST
Run Atlas repeatedly after the same event. The same source/action must never create a duplicate journal.

VOID SAFETY TEST
Void a sent invoice only on a disposable test company. Atlas should surface a failed finance task explaining that a controlled reversal/credit workflow is required. Do not use void on real posted invoices until Pack 2C is installed.
