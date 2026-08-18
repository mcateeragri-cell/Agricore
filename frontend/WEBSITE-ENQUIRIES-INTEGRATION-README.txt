AgriCore Website Enquiries Integration
====================================

Adds tenant-safe public website lead capture for AgriCore companies.

Flow
----
1. Company admin opens Settings > Website Integrations.
2. Generate an integration key. The key is bound server-side to the active AgriCore company.
3. Public website POSTs to /api/public/website-enquiries with Authorization: Bearer <token>.
4. Enquiry appears at /enquiries for that company only.
5. Office reviews and clicks "Accept & create job".
6. AgriCore matches/creates the customer, creates a machine when a useful machine description exists,
   creates an OPEN UNSCHEDULED job, and links the original website enquiry to that job.

McAteer website
---------------
The McAteer site already supports:
  AGRICORE_ENQUIRY_WEBHOOK_URL
  AGRICORE_ENQUIRY_WEBHOOK_TOKEN

After this AgriCore build is deployed and the migration is run:
- create a key from AgriCore > Settings > Website Integrations
- set AGRICORE_ENQUIRY_WEBHOOK_URL to:
  https://<your-agricore-domain>/api/public/website-enquiries
- set AGRICORE_ENQUIRY_WEBHOOK_TOKEN to the generated acwi_... token
- redeploy the McAteer website

Security
--------
- company_id is NEVER accepted from the public website payload.
- SHA-256 of the integration token is stored; plaintext is shown once.
- public tenant tables are not exposed to anon/authenticated roles.
- office enquiry list is scoped by active company and operational branch access.
- integration management is restricted to company/platform admins or settings.manage.

Migration
---------
supabase/migrations/20260818_035_company_website_enquiries.sql

Test before production
----------------------
1. npm.cmd run build
2. Run migration in Supabase SQL Editor.
3. Deploy AgriCore.
4. Create integration key while McAteer Agricultural Services is the active company.
5. Configure the two McAteer Vercel server-side environment variables.
6. Submit a test enquiry from mcateeragservices.co.uk.
7. Confirm it appears only in McAteer's /enquiries screen.
8. Accept it and confirm the new job appears in Jobs/Dispatch as open and unscheduled.
