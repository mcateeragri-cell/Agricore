AgriCore Modular Platform Pack 3 — Role KPI Widgets
===================================================

Extract over:
C:\projects\Agricore\frontend

Built on top of:
- Modular Platform Pack 1
- Full-App Module Enforcement Pack 1B
- Role-Specific Dashboards Pack 2

What this adds
--------------
Four new configurable dashboard widgets:

Dealer Principal KPIs
- Active depots
- Workshop loading %
- Revenue
- Profit
- Uses the existing Enterprise Depot Performance endpoint

Service Manager KPIs
- Open jobs
- Urgent jobs
- Waiting-parts jobs
- Active engineers

Parts Manager KPIs
- Low-stock lines
- Stock value
- Open purchase orders
- Pending depot transfers

Office KPIs
- Outstanding invoice balance
- Draft invoices
- Quotes awaiting action
- Open jobs

Role defaults
-------------
Company Admin / Administrator:
- Dealer Principal KPIs first when Multi-Branch is enabled.

Service Manager:
- Service Manager KPIs first.

Parts Manager:
- Parts Manager KPIs first.

Office:
- Office KPIs first.

Read Only:
- Role-specific operational KPI widgets remain hidden by default.

Important
---------
- These are normal dashboard widgets, not separate dashboards.
- Administration > Dashboard Layouts can reorder/hide them.
- Personal dashboard customisation still works when allowed.
- Module state is enforced.
- Financial data is only returned/shown to users with financial access.
- Operations and finance depot scopes continue to apply.
- Technician and Apprentice continue using their field dashboard.

No SQL migration.
No new environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
1. Company Admin on Enterprise + Multi-Branch:
   Dealer Principal KPIs should show depot count, workshop load, revenue and profit.
2. Service Manager:
   Service KPI card should show jobs/urgent/waiting parts/engineer activity.
3. Parts Manager with Stock enabled:
   Parts KPI card should show stock value, low stock, POs and transfers.
4. Office user with invoice permission:
   Office KPI card should show outstanding balance, drafts, quotes and jobs.
5. Remove invoice permission from an Office role:
   Financial data should not be returned.
6. Disable Stock module:
   Parts KPI widget should disappear automatically.
