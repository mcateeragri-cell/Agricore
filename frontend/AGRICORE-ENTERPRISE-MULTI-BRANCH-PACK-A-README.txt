AgriCore Enterprise Multi-Branch — Pack A
========================================

Extract this patch over C:\projects\Agricore\frontend.

Pack A delivers the foundation only; existing single-depot companies remain operational.

Included
--------
- company_branches table with automatic Main Depot for every existing company
- branch_id foundation on customers, machines, jobs, quotes, invoices, stock and finance records
- automatic default-branch trigger so legacy inserts continue to work
- Enterprise-only multi_branch feature entitlement
- independent Operations scope and Finance scope per user
- home depot plus selected-depot access
- server auth context now carries branch scope
- active depot cookie and switch API
- desktop/mobile depot selector when Enterprise has more than one accessible depot
- Administration > Branches & Depots management page
- user scope editor for depot/job and finance visibility

Scope meanings
--------------
Operations: own_jobs | branch | selected | company
Finance:    none | branch | selected | company

Permissions remain authoritative. A finance scope never grants invoice/finance permission; it only narrows records once the user already has that permission.

Migration
---------
Run supabase/migrations/20260814_026_enterprise_multi_branch_foundation.sql

Important
---------
This foundation does NOT yet filter every existing Jobs/Stock/Finance query by branch. The schema, auth context and management controls are in place first so Pack B can apply branch filters safely to operational routes, followed by Pack C for finance/reporting and additional-depot Stripe billing.

No new environment variables in Pack A.

Build
-----
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
