AgriCore v1 Launch-Ready Web Pass
================================

This build is based on the latest project ZIP supplied on 13 August 2026.

Changes in this pass
--------------------
1. Real public demo/contact enquiry form at /contact.
2. Server-side public lead capture API at /api/public/contact.
3. New platform_leads table with RLS/service-role-only access.
4. New Platform -> Launch leads screen at /platform/leads.
5. UTM source/medium/campaign and referrer capture for advertising attribution.
6. Honeypot field and server-side validation for public contact spam reduction.
7. Removed the placeholder "demo booking can be added later" experience.
8. Updated stale Professional-only trial copy to Starter / Professional / Enterprise.
9. Added international-use transparency around regional settings and local regulatory responsibility.
10. Added SoftwareApplication structured data to the public homepage for search engines.
11. Added canonical metadata to Pricing and Contact.

Required database migration
---------------------------
Run:
  supabase/migrations/20260813_023_public_launch_leads.sql

Expected result:
  Success. No rows returned

No new environment variables are required for this pass.

Build check
-----------
Run from the frontend folder:
  Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
  npm.cmd run build

Post-deploy smoke tests
-----------------------
1. Open /contact without signing in.
2. Submit a demo request using a test email address.
3. Sign in as AgriCore platform super admin / platform admin.
4. Open /platform/leads and confirm the enquiry appears.
5. Open /pricing and check Starter £49, Professional £89, Enterprise £225.
6. Open / and verify the trial FAQ references all three plans.
7. Open /terms and confirm the trial wording is plan-neutral.

Launch note
-----------
The existing Privacy and Terms pages still correctly identify themselves as product drafts requiring legal review before broad commercial marketing. This pass deliberately does not remove that warning or imply legal review has happened.
