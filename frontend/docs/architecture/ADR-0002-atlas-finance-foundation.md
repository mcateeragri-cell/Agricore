# ADR-0002: Atlas Finance is global, double-entry and event-driven

## Status
Accepted for Platform Pack 2A.

## Decision
AgriCore Finance will use a company-scoped financial profile, chart of accounts, periods, tax-code abstraction and double-entry journal model. Operational modules will not calculate statutory reports directly. Pack 2B will translate platform events into balanced journal postings.

## Global-first rules
- No finance service may assume GBP, VAT, HMRC or a January year end.
- Country and currency are ISO configuration values.
- Tax terminology and rates are company configuration; jurisdiction connectors are separate plug-ins.
- Financial-year dates are explicit company configuration and are never inferred from country.
- Posting rules target account `system_key` values, not account numbers.

## Safety boundary
Pack 2A does not submit tax returns, post existing invoices into the ledger, or replace an accountant. It establishes the accounting domain and data model only.
