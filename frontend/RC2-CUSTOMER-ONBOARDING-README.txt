AgriCore RC-2 — Customer Onboarding

This is an OVERLAY package for the current RC-1.1 frontend.
Extract it over C:\projects\Agricore\frontend.
It only replaces/adds the RC-2 files and does not remove any existing API routes or other project files.

WHAT RC-2 ADDS
- Polished 6-step onboarding experience
- Progress autosave / resume using the existing company_onboarding API
- Business details setup
- Invoice/payment setup
- Team invite step with skip option
- Three start paths:
  * Start empty
  * Load safe synthetic sample data
  * Import existing data from CSV
- Customer CSV import
- Machine CSV import with customer matching
- Small removable onboarding sample dataset:
  * 5 synthetic customers
  * 10 synthetic machines
  * 12 synthetic jobs
- First customer / first machine / first job completion screen
- Dashboard Setup Progress card for company admins
- Setup card automatically reflects real customer/machine/job/team counts
- Optional guided product tour
- Guided tour can be replayed from Help

NO SQL MIGRATION IS REQUIRED.
RC-2 uses the company_onboarding table and APIs already in the current AgriCore build.

CSV FORMATS

Customers:
business_name,contact_name,customer_type,phone,email,address,postcode,vat_number,notes

Machines:
customer_business_name,make,model,machine_type,year,registration,serial_number,hours,usage_profile,estimated_hours_per_week

Notes:
- Machine import only imports rows whose customer_business_name matches an existing AgriCore customer.
- usage_profile accepts light, medium or heavy; other values default to medium.
- Sample records are clearly marked and use example.invalid / SAMPLE identifiers.
- Sample data is intended only to help a new trial understand AgriCore and can be removed from onboarding.
- The setup checklist is shown only to company admins/administrators/settings managers and disappears when onboarding is completed.

INSTALL
1. Extract this ZIP over:
   C:\projects\Agricore\frontend

2. Run:
   taskkill /F /IM node.exe
   Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
   npm.cmd run dev -- --webpack

ACCEPTANCE TEST
1. Use a fresh subscription test company.
2. Open /onboarding.
3. Complete Business and Billing setup.
4. Skip or open Team setup.
5. Test "Start empty".
6. Return and test "Explore sample data".
7. Confirm 5 customers / 10 machines / 12 jobs appear.
8. Remove sample data and confirm those synthetic records disappear.
9. Test a customer CSV import.
10. Test a machine CSV import linked by customer_business_name.
11. Complete onboarding with at least one customer/machine/job.
12. Confirm dashboard opens with guided tour.
13. Replay tour from Help.
14. On an incomplete test company, confirm Setup Progress appears on the dashboard.
15. Confirm technician accounts do not see the setup checklist.

VALIDATION
All changed TS/TSX files were syntax-checked with the TypeScript compiler transpiler.
Run the full local Next.js production build for final project-level validation.
