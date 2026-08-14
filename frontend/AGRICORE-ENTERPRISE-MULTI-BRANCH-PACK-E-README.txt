AgriCore Enterprise Multi-Branch Pack E
========================================

Purpose
-------
Proper multi-depot stock architecture for dealership groups.

What changes
------------
- stock_items remains one company-wide parts catalogue.
- stock_branch_balances stores quantity/reserved/minimum/reorder/location per depot.
- existing stock is backfilled into its current/Main Depot.
- company-level quantity_in_stock remains synchronised as the sum of depot balances for legacy quote/search/network compatibility.
- every new stock movement resolves a depot and updates that depot balance.
- job usage/returns follow the job depot automatically.
- purchase receipts follow the purchase-order depot automatically.
- manual adjustments require a specific active depot.
- new stock opening balances and new purchase orders use the selected depot.
- audited depot-to-depot transfer centre added at /stock/transfers.

Migration
---------
Run after 026, 027 and 028:
supabase/migrations/20260814_029_enterprise_multi_depot_stock.sql

No new environment variables.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
1. Confirm existing stock appears in Main Depot.
2. Create Dungannon depot if not already present.
3. Open Stock > Depot Transfers.
4. Transfer 1 unit of a test part Main -> Dungannon.
5. Confirm source falls by 1 and destination rises by 1.
6. Switch active depot and verify Stock inventory quantity changes.
7. Add a manual adjustment while a specific depot is selected.
8. Create a test job in Dungannon, use a stocked part and confirm Dungannon stock is reduced.
9. Create a purchase order while Dungannon is selected and receive stock; confirm Dungannon stock increases.

Important
---------
Do not manually edit stock_items.quantity_in_stock after this migration. It is a company aggregate maintained from depot balances.
