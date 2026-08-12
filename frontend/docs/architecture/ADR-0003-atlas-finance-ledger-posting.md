# ADR-0003 — Atlas Finance Ledger Posting Engine

## Status
Accepted — Platform Pack 2B.

## Decision
Operational modules never write directly to financial reports or journal-line tables. Financial lifecycle changes are captured as Atlas events and converted to balanced double-entry journals by a server-side posting service.

## Guarantees
- Journals are company-scoped and must fall inside an open financial period.
- Posting is atomic inside PostgreSQL and rejected if debits and credits do not balance.
- Account resolution uses stable `system_key` values, not local chart account numbers.
- Source/action uniqueness makes retries idempotent.
- Issued invoice financial fields are locked; corrections must use future credit/reversal workflows rather than rewriting posted history.
- Accrual profiles post invoices on issue and cash receipts against receivables.
- Cash profiles recognise invoice revenue/tax as receipts are recorded.
- Tax-return reporting and statutory filing are deliberately deferred until the ledger pipeline has been proven.

## Event flow
`invoice change -> atlas_events -> atlas_queue(finance_posting) -> Finance posting service -> finance_post_journal RPC -> posted journal + lines`

## Future work
Pack 2C adds controlled reversals/credit notes, tax validation and trial-balance/tax preparation views. Supplier purchase posting follows once supplier invoice semantics are finalised.
