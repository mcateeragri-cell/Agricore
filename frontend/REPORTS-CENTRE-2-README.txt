AgriCore v1.2 - Reports Centre 2.0
=================================

What changed
------------
- Expanded /reports into a full management reporting centre.
- Added period filters: 30 days, 90 days, 12 months, all time.
- Added financial KPIs: invoiced revenue, payments, outstanding, VAT, average invoice and collection rate.
- Added six-month invoice/payment trend chart.
- Added invoice ageing buckets and overdue balance.
- Added jobs completion/open metrics.
- Added labour hours and labour value plus engineer workload ranking.
- Added quote activity and decided quote win rate.
- Added top customers by invoiced revenue.
- Added stock cost/retail valuation, low-stock and out-of-stock counts.
- Added service exposure: overdue and due-soon service programme assignments.
- Expanded CSV export to include jobs, invoices, labour and stock, respecting the selected report period.

Security
--------
- Page and export both require invoice financial permissions.
- Every database query is filtered by the authenticated active company_id.
- No cross-company aggregation is performed.

Database
--------
- No SQL migration required.

Test checklist
--------------
1. npm.cmd run build
2. Open /reports as company admin/office user with invoices.view.
3. Switch 30d / 90d / 12m / All time filters.
4. Confirm totals change with the selected period.
5. Confirm CSV export downloads and contains only the active company's records.
6. Switch to a second company and confirm all figures change/isolate correctly.
7. Verify a technician/apprentice cannot access the financial reports route through normal permissions/navigation.
