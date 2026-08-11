AgriCore Dashboard 2.0
======================

This release upgrades the office/admin dashboard while leaving the technician dashboard unchanged.

Added:
- Executive KPI cards (jobs today/week, completed work, revenue, outstanding invoices, quote pipeline, stock alerts).
- Six-month paid revenue trend.
- Company-scoped team status using company_member_profiles/company_member_roles/job_assignments.
- Recent business activity feed.
- Dynamic date, company name and signed-in user initials in the dashboard header.
- Improved loading, empty and dark-mode states.

Security / tenant isolation:
- All new Supabase queries are filtered by the active company ID.
- Financial widgets continue to respect canViewFinancialInformation().
- Technician/apprentice users continue to receive the existing TechnicianDashboardPage instead of the executive dashboard.

No database migration is required.

Local validation:
1. Remove .next.
2. npm.cmd run build
3. npm.cmd run dev -- --webpack
4. Test /dashboard as company admin and technician.
5. Switch active company and verify all values/team/activity change to that company only.
