AgriCore UI Refresh 2

Purpose
- Unify high-frequency office workspaces without changing business logic.
- Make Customers, Machines, Quotes, Invoices and Stock visually consistent.
- Improve mobile action layout, metric density, data scanning and dark-mode use.

Install
1. Extract this ZIP over C:\projects\Agricore\frontend
2. Allow matching files to replace.
3. From C:\projects\Agricore\frontend run:
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run build
4. If successful:
   git add .
   git commit -m "UI Refresh 2 everyday workflows"
   git push origin main

No SQL migration is required for this patch.

Changed
- Components/ui/WorkspaceHeader.tsx (new reusable workspace header)
- app/globals.css (workspace/mobile/table polish)
- Customers
- Machines
- Quotes
- Invoices
- Stock

This patch deliberately does not alter underlying Supabase queries, finance posting,
permissions or workflow state transitions.
