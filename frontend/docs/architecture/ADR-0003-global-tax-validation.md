# ADR-0003 — Global Tax Engine and Finance Validation

## Status
Accepted for Platform Pack 2C.

## Decision
AgriCore stores company-configured tax settings, effective-dated tax-code rates and tax reporting periods without embedding current statutory rates, filing dates or country-specific legal rules in application code.

Tax rates are configuration data. Posted finance history is immutable: corrections use reversing journals rather than deleting ledger entries.

Finance validation is server-side and company-scoped. The validator can identify ledger imbalance, invalid period linkage, tax-bearing lines without a tax code and failed Atlas finance postings. Additional validators can be added without changing operational modules.

## Why
AgriCore is global-first. Statutory rules change and differ by jurisdiction, so the core platform must not guess them. Country/government connectors can later supply verified jurisdiction-specific requirements while the core ledger remains stable.

## Accounting safety
Pack 2C is preparation infrastructure only. It does not claim a tax return is compliant, does not submit returns, and does not calculate jurisdiction-specific filing obligations automatically.
