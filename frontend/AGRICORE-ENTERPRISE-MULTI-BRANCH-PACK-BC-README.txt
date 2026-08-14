AgriCore Enterprise Multi-Branch Pack B+C
===========================================

Extract over C:\projects\Agricore\frontend AFTER Pack A.

Migration: supabase/migrations/20260814_027_enterprise_multi_branch_operations_finance.sql

Pack B operations
- All-depots option for users whose operations scope is selected/company.
- Jobs, Customers, Machines and Rapid Job Creation follow the active depot.
- New customers/machines/jobs inherit the active depot.
- Dispatch queries are narrowed to the active/accessible depot set.
- Calendar assignment/event foundation is branch-aware.
- Restrictive RLS policies narrow core records by branch while preserving existing role/company permissions.
- Technicians retain own-assigned-job access.

Pack C finance
- Independent Finance depot selector: Home depot / selected depots / whole company.
- Finance dashboard and reports follow finance scope, not operations scope.
- Purchase ledger is branch-aware and writes require a specific depot.
- Enterprise price becomes £149/month including one depot.
- Each additional active depot is £30/month.
- Stripe add-on quantity uses STRIPE_PRICE_ENTERPRISE_BRANCH_MONTHLY.
- Adding/deactivating a depot attempts to synchronise the Stripe add-on quantity.

Vercel
Create a recurring GBP £30/month Stripe Price and add:
STRIPE_PRICE_ENTERPRISE_BRANCH_MONTHLY=price_xxx

Existing single-depot customers remain on Main Depot and do not change behaviour.

Build:
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
