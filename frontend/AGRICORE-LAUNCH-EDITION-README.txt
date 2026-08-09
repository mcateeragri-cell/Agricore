AgriCore Launch Edition — final polish pass

Install
1. Extract this ZIP over C:\projects\Agricore\frontend
2. Allow Windows to replace existing files.
3. Run:
   npm.cmd run build
   npm.cmd run dev -- --webpack

What this release adds
- Reports Centre at /reports with company-scoped operational and financial metrics.
- CSV report export at /api/reports/export.
- Reports restored to navigation for financial/office users only; technicians remain excluded.
- My Account page for personal profile and password changes.
- Forgot-password and reset-password flows.
- Help Centre with direct links to core workflows.
- My Account and Help shortcuts in the signed-in user card.
- Platform dashboard now shows new-company count for the month and a trial-to-paid conversion snapshot.
- Existing company branding/logo upload remains untouched because it is already implemented.

Important
- No Supabase migration is required for this release.
- Reports are deliberately company-scoped using the active company context.
- Detailed technician profitability/labour-margin reporting is intentionally deferred until consistent cost data is present across live companies.
- Run the local production build before pushing to Git/Vercel.
