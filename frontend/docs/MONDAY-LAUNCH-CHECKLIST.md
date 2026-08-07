# AgriCore Monday Launch Checklist

This checklist is for the first real-company onboarding release. Freeze non-essential feature work until these checks pass.

## Code hardening included in this package

- Removed the unfinished `/reports` navigation entry so users cannot hit a visible 404.
- Removed other known dead dashboard links (`/customers/new`, `/machines/new`).
- Company Settings now enforces `settings.manage` on the server.
- Technician/apprentice users are gated out of office customer, machine, quote, invoice, stock and dispatch route trees.
- Dispatch API now rejects technician/apprentice access to the whole-company dispatch board.
- Calendar remains company-scoped and non-managers only receive their own calendar data.
- Removed the old duplicate sidebar from the office completion review page.
- Preserved the existing company-scoped calendar, jobs, customers, machines, quotes, invoices, stock, service-programme and Stripe billing work.

## Must pass before inviting the first real company

- [ ] `npm.cmd run build` passes locally.
- [ ] Deploy the exact build to a Vercel preview and smoke-test it.
- [ ] McAteer Agricultural and a second test company show completely separate users, customers, machines, jobs, calendar entries, invoices, quotes and stock.
- [ ] A user who belongs only to McAteer Agricultural cannot select or access the second company.
- [ ] A technician sees only their own/shared assigned jobs and cannot open Customers, Machines, Dispatch, Quotes, Invoices or Stock by manually typing the URL.
- [ ] Company Administrator can manage Users, Roles, Company Settings and Billing for their own company.
- [ ] Fresh signup creates the company, membership, company_admin role, trial, default features and onboarding row.
- [ ] Stripe Checkout collects a card/Apple Pay with £0 due today and returns to AgriCore.
- [ ] Stripe webhook returns HTTP 200 and `company_subscriptions` stores the Stripe customer/subscription IDs.
- [ ] Billing page shows the trial and recognises that a Stripe subscription/payment method is configured.
- [ ] Company can open Stripe Customer Portal and cancel/update payment details.
- [ ] Onboarding completes and company branding/payment settings remain company-specific.
- [ ] Create customer -> add machine -> create job -> assign technician -> complete job -> review -> invoice works end-to-end.
- [ ] Invoice and service-report PDFs show only the active company branding/payment details.
- [ ] Photos, signatures and GPS still work on Safari/iPhone.
- [ ] Technician offline queue still opens cached jobs and syncs after reconnecting.

## Production configuration before Monday

- [ ] Use Stripe LIVE keys/price IDs only in Vercel production; keep test keys locally for development.
- [ ] Configure the production Stripe webhook URL and its production `whsec_...` in Vercel.
- [ ] Ensure `NEXT_PUBLIC_APP_URL` points to the production HTTPS URL in Vercel.
- [ ] Re-enable Supabase email confirmation for real users.
- [ ] Configure a reliable SMTP provider for verification/password-reset emails rather than relying on development email limits.
- [ ] Confirm Supabase Auth redirect URLs include the production login/onboarding URLs.
- [ ] Rotate any secret keys that have ever appeared in screenshots/chat and update Vercel/local environment variables.
- [ ] Confirm `.env*` files are not committed to Git.
- [ ] Back up the Supabase database before first external onboarding.
- [ ] Publish Terms of Service, Privacy Policy and clear trial/automatic-renewal/cancellation wording before taking real card details. Have the final legal wording reviewed for your business.

## Deliberately deferred until after Monday

- Reports/management analytics.
- Public marketing website.
- Expanded AI diagnostics.
- Customer portal.
- Advanced subscription-plan tiers.

The launch target is reliability: no visible dead routes, no cross-company leakage, a clean signup/billing/onboarding flow, and a dependable core CRM workflow.
