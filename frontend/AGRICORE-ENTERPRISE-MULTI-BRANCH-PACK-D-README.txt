AgriCore Enterprise Multi-Branch Pack D
=======================================

Builds on migrations 026 + 027.

Adds
----
- Depot Performance dashboard with:
  * open jobs by depot
  * engineer count by home depot
  * scheduled workshop hours vs contracted weekly capacity
  * workshop load percentage
  * invoice/outstanding totals
  * posted finance revenue, expenses and profit by depot
  * profitability ranking
- Depot Manager assignment in Branches & Depots.
- Transfer Centre with audited cross-depot transfer for:
  * jobs
  * customers (home depot only)
  * machines (home depot only)
  * engineers (home depot only)
- Transfer audit table.
- Enterprise-only navigation gating for branch pages, including company admins.

Important stock decision
------------------------
This pack intentionally does NOT fake stock transfers.
AgriCore currently has a company-wide unique part master and quantity on stock_items.
A correct dealership implementation needs a company-wide part catalogue plus per-depot
stock balances. That will be Multi-Branch Stock Pack E so quantity cannot be corrupted by
moving a stock item record between depots.

Migration
---------
Run after 026 and 027:
supabase/migrations/20260814_028_enterprise_depot_operations.sql

No new environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke tests
-----------
1. Branches & Depots: assign a depot manager and save.
2. Open Administration > Depot Overview and compare depots.
3. Confirm workshop load changes based on scheduled assignments and contracted staff hours.
4. Transfer a test job between depots; confirm it disappears/appears according to branch scope.
5. Transfer a machine/customer and confirm historical jobs remain untouched.
6. Move a technician home depot and confirm old assignments remain intact.
7. Check Transfer Centre recent audit history.
