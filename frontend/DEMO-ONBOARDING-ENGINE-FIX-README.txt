AgriCore v1.0 Demo Onboarding Engine Fix

This release fixes the two demo creation failures shown during testing:

1. "length is not defined"
   - The synthetic customer generator accidentally referenced an undefined `length`.
   - It now uses an explicit loop and no implicit length variable.

2. company_member_profiles_membership_fkey
   - The previous demo creator inserted company_members and company_member_profiles concurrently.
   - Current AgriCore databases enforce membership before profile/role records.
   - Demo creation now follows the production onboarding order:
       Company
       -> company_members
       -> company_member_profiles
       -> company_member_roles
       -> company settings/onboarding
       -> permissions/features
       -> synthetic business data

Important:
- No fake auth users are created.
- The signed-in AgriCore platform administrator is linked to each demo workspace.
- Demo companies are still excluded from Stripe subscription creation.
- Existing procedural synthetic customer, machine, registration, serial, job, invoice, stock and purchase-order generation is preserved.
- Optional/missing module tables remain tolerated during cleanup.
- No SQL migration is required.

Install:
Extract over:
C:\projects\Agricore\frontend

Then run:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

Test:
1. Open /platform/demo-companies.
2. Create a Small workshop demo.
3. Create a Medium service business demo.
4. Switch into each workspace and check Dashboard, Customers, Machines, Jobs, Quotes, Invoices, Stock and Reports.
5. Regenerate one demo.
6. Delete one demo.
7. Confirm the existing non-demo company is unaffected.

Validation:
The modified TypeScript file was syntax-checked. A full Next.js build could not be run in the packaging environment because node_modules are intentionally excluded from uploaded project ZIPs; run the commands above locally for the final production validation.
