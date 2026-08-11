AgriCore Demo Company Generator — Synthetic Data Fix

Changes in this build:
- Fixed machines_usage_profile_check by using only: light, medium, heavy.
- Customer business names are randomly assembled on every demo creation/reset.
- Customer contact names are synthetic demo/sample names.
- Customer phone values are deliberately non-routable DEMO identifiers.
- Customer emails use the reserved .invalid domain.
- Customer addresses/postcodes are explicit demo-only values.
- Machine registrations are random DEMO-prefixed identifiers, not plausible real registrations.
- Machine serial numbers are random DEMO-prefixed identifiers, not plausible OEM serials.
- Technician display names use Demo Engineer A-F to avoid implying real staff.
- All jobs, quotes, invoices and histories remain linked to the generated customers/machines.

No SQL migration is required.

Test:
1. taskkill /F /IM node.exe
2. Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
3. npm.cmd run build
4. npm.cmd run dev -- --webpack
5. Open /platform/demo-companies
6. Delete any failed/partial demo company if present.
7. Create a new demo company.
8. Verify Customers, Machines, Jobs, Invoices, Stock and Reports.
9. Click Reset and confirm a fresh set of customer names/registrations/serial numbers is generated.
