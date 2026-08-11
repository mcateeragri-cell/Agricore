AgriCore v1.0 Demo Workspace Engine

This release replaces the earlier demo-company behaviour with a safer procedural demo workspace manager.

WHAT CHANGED
- Safe dependency-aware deletion of demo business data before deleting a demo company.
- Failed demo creation now performs the same cleanup instead of attempting to delete the company first.
- Reset/regenerate keeps the workspace but replaces its synthetic company identity, branding and sample data.
- Demo workspace limit: 5.
- Demo size profiles:
  * Small workshop
  * Medium service business
  * Large workshop
  * Dealer-style operation
- Create similar: generates another fresh synthetic workspace using the currently selected profile.
- Customers, contact details, registrations and serial numbers remain synthetic/demo-only.
- Demo identifiers continue to include DEMO markers where appropriate.
- Optional older tables are tolerated during cleanup.

NO SQL MIGRATION REQUIRED.

INSTALL
Extract this ZIP over:
C:\projects\Agricore\frontend

Then run:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

TEST
1. Open /platform/demo-companies.
2. Delete the two old Green Valley demo workspaces. They should now delete without the customers_company_id_fkey error.
3. Choose Small workshop and create a demo.
4. Create a Medium demo.
5. Regenerate one workspace and confirm its company name/branding/sample data change.
6. Create similar and confirm a separate synthetic workspace appears.
7. Confirm creation is blocked at 5 workspaces.
8. Switch into a generated demo and check Dashboard, Customers, Machines, Jobs, Quotes, Invoices, Stock and Reports.
9. Delete a generated demo and confirm it disappears cleanly.

NOTE
Cleanup is dependency-aware at application level. It deliberately avoids changing production foreign-key behaviour for normal customer companies.
