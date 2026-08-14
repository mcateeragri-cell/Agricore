AgriCore Commercial Launch Pack 2
==================================

Extract over:
C:\projects\Agricore\frontend

What this fixes
---------------
1. Public marketing/SEO pages no longer render inside the authenticated AgriCore
   application shell. This removes the company sidebar, global search and mobile
   app navigation from public sales pages even when the visitor is already logged in.

2. Public navigation is simplified to:
   Product
   Solutions
   Industries
   Pricing
   ROI calculator
   Demo

   Book demo / Start free trial remain the primary commercial actions.

3. Every SearchLanding-based SEO/ad page now includes:
   - stronger problem/benefit section
   - connected four-step workflow
   - specialist-vs-disconnected comparison
   - business-focused FAQ section
   - expanded final demo/trial CTA

Routes made shellless include:
/
about
agricultural-crm
agricultural-engineer-software
agricultural-engineering-software
agricultural-invoicing-software
blog
contact
cookies
demo
farm-machinery-workshop-software
features
field-service-management-agriculture
founding-customers
industries
machinery-service-management-software
mobile-job-sheets-agricultural-engineers
pricing
privacy
roi-calculator
security
terms
workshop-scheduling-software
plus auth/onboarding public routes.

No SQL migration.
No new environment variables.

Build:
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test after deployment:
1. Sign in to AgriCore.
2. Open /agricultural-crm in another tab.
3. Confirm the dark app sidebar is NOT present.
4. Check /agricultural-invoicing-software and /agricultural-engineer-software.
5. Confirm the public header is clean and the page contains workflow, comparison,
   FAQ and final CTA sections.
