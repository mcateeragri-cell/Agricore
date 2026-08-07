AgriCore Multi-Tenant Audit Release
===================================

Primary issue fixed
-------------------
The Calendar API previously loaded staff from the legacy global tables
app_user_profiles and app_user_roles. Because those tables were not scoped to
the active company, staff from McAteer Agricultural could appear in another
company's weekly planner.

The Calendar API now:
- loads profiles from company_member_profiles for the active company only;
- loads roles from company_member_roles for the active company only;
- verifies active company membership before a person can be scheduled;
- verifies membership again when an assignment is edited;
- only resolves fallback authentication users when they are active members of
  the current company;
- treats company_admin as a schedulable company role without inheriting roles
  from any other company.

Additional isolation hardening
------------------------------
The full job-card screen now scopes the job, labour, parts, stock and linked
invoice queries to the active company. Job/labour/parts mutations are also
scoped to the active company and current job, preventing an ID from another
company being used by a client-side request.

The API audit found the major server-side CRM endpoints already use company_id
scoping (dispatch, invoices, administration users/roles, service templates,
manufacturer settings, billing and technician APIs). Existing platform-admin
routes intentionally retain cross-company access and remain protected by
platform-role checks.

Database migration
------------------
Run:
  supabase/migrations/20260807_004_multitenant_permission_seed.sql

It idempotently records the seven permissions that self-service signup expects
and prevents the company_role_permissions foreign-key failure seen during the
trial signup test.

Stripe
------
No Stripe subscription or webhook logic was removed. The working Stripe billing
routes and company subscription flow are preserved.

Verification after extraction
-----------------------------
1. Run the migration above in Supabase.
2. npm.cmd run build
3. npm.cmd run dev -- --webpack
4. Sign into McAteer Agricultural and confirm Kirsty Clarke appears there.
5. Switch to the test New Holland company and confirm Kirsty does NOT appear in
   Calendar/Dispatch unless explicitly added as a member of that company.
6. Confirm a user can have different roles in different companies.
7. Open a job in each company and verify stock/labour/parts remain isolated.
8. Re-test Settings > Billing and Stripe webhook status.

Notes
-----
The supplied upload intentionally excluded .env.local. Keep Stripe/Supabase
secrets in .env.local/Vercel only and never commit them.

The packaging environment could not restore one npm dependency from its
internal registry, so the final Next.js production build must be run locally.

Role/API hardening added
------------------------
Calendar management mutations now require company_admin/administrator access or
an explicit calendar.manage permission for the active company. Members without
that permission receive only their own calendar rows through the Calendar API,
which prevents a technician from bypassing the UI and requesting another
company member's schedule directly.
