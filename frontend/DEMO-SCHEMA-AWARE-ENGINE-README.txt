AgriCore v1.0 Schema-Aware Demo Workspace Engine

Fixes the current Supabase error:
Could not find the table 'public.job_parts' in the schema cache

WHAT CHANGED
- Demo cleanup now treats PostgREST PGRST205 schema-cache errors as optional/missing tables and skips them safely.
- PostgreSQL undefined-table (42P01) and undefined-column (42703) errors are also treated as optional schema differences during cleanup.
- Cleanup still runs in dependency order for tables that do exist.
- Existing foreign-key protection for normal production companies is unchanged.
- Fixed an accidental duplicated jobs loop in the procedural generator so each profile creates the intended number of jobs rather than multiplying the count.
- Synthetic customer/company/machine identity generation remains intact.
- No SQL migration required.

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
2. Delete both old Green Valley demo workspaces.
3. Confirm they delete without the customers FK or job_parts schema-cache errors.
4. Create a Medium service business demo.
5. Switch into it and verify Dashboard, Customers, Machines, Jobs, Quotes, Invoices, Stock and Reports.
6. Regenerate it and confirm identity/data changes.
7. Delete it again and confirm clean removal.

IMPLEMENTATION NOTE
The current Supabase JS/PostgREST API does not expose information_schema through the normal table client. The engine therefore performs runtime schema probing: it attempts each optional cleanup table and recognises PostgREST/PostgreSQL missing-table or missing-column responses, skipping only those schema differences while still failing on genuine database errors.
