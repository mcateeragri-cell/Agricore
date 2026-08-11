AgriCore RC-1 Commercial Billing

PURPOSE
This release finishes the self-service commercial billing layer around the existing Stripe trial/checkout integration without changing tenant invoice payment providers.

WHAT IS INCLUDED
- Professional remains the only self-service public launch plan at £89/month + tax.
- Starter is prepared at £49/month but remains non-public.
- Enterprise remains sales-assisted/non-public.
- 14-day trial continues to be created at signup.
- Checkout collects a Stripe payment method before the trial ends.
- Stripe customer and subscription ids are synchronised back into AgriCore.
- Billing page now live-syncs subscription state from Stripe.
- Billing page shows card brand/last four/expiry where Stripe exposes the default payment method.
- Stripe invoice/receipt history is shown directly in AgriCore with View/PDF links.
- Customer Portal remains available for payment-method and invoice management.
- Company admins can schedule cancellation at period end directly from AgriCore.
- A scheduled cancellation can be reversed before the period ends.
- Webhook delivery is idempotent through stripe_webhook_events.
- invoice.paid, payment_failed and payment_action_required update local subscription health.
- Failed payment state creates a 7-day AgriCore grace window.
- Dashboard shows trial-ending, payment-attention and cancellation banners to billing administrators.
- Expired/cancelled/grace-expired companies receive a UI access gate while Billing, Account and Help remain accessible.
- Demo workspaces never create Stripe subscriptions.
- Billing uses the company regional formatter while the launch Stripe plan remains GBP.
- Database-backed plan metadata now includes Stripe price id, currency, public status and future plan-feature entitlement mapping.

REQUIRED SQL MIGRATION
Run this in Supabase before deploying the code:
  supabase/migrations/20260810_005_rc1_commercial_billing.sql

STRIPE / VERCEL ENVIRONMENT VARIABLES
Required in Production:
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
  NEXT_PUBLIC_APP_URL=https://app.getagricore.com

Keep these secrets out of Git and screenshots.

STRIPE CUSTOMER PORTAL
In Stripe Dashboard -> Settings -> Billing -> Customer portal, enable the actions you want customers to self-serve, particularly:
- update payment methods
- invoice history
- cancel subscriptions
If the portal does not expose one of those actions, it is a Stripe portal configuration issue rather than an AgriCore route issue.

LIVE WEBHOOK ENDPOINT
  https://app.getagricore.com/api/billing/webhook

Recommended events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed
- invoice.payment_action_required

LOCAL TEST
1. Run the SQL migration.
2. Keep local Stripe CLI forwarding to http://localhost:3000/api/billing/webhook if testing Stripe locally.
3. taskkill /F /IM node.exe
4. Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
5. npm.cmd run build
6. npm.cmd run dev -- --webpack

RC-1 ACCEPTANCE TEST
A. Existing paid/test company
- Open /settings/billing.
- Confirm plan/status loads.
- Confirm Stripe payment method shows if one exists.
- Confirm billing history loads.
- Open Manage card & invoices.
- Schedule cancellation at period end.
- Confirm cancellation banner appears.
- Click Keep subscription and confirm cancellation reverses.

B. New signup
- Use a fresh test email/company.
- Confirm 14-day Professional trial is created.
- Complete Stripe Checkout and collect a payment method.
- Confirm webhook returns HTTP 200.
- Return to Billing and Refresh status.
- Confirm Stripe subscription id/payment method/history state is populated.

C. Failed payment simulation (Stripe Test mode)
- Use Stripe test tooling to trigger a failed renewal/payment event.
- Confirm AgriCore shows Payment needs attention and local status becomes suspended.
- Confirm Billing remains accessible.

D. Trial expiry gate
- On a disposable test company only, set trial_ends_at in the past and leave status=trial.
- Confirm normal app pages show the subscription-required gate.
- Confirm /settings/billing remains accessible.

E. Demo safety
- Switch to a demo workspace.
- Confirm no Stripe checkout/subscription is required and normal demo access remains available.

NOTES
- True feature-by-plan enforcement is prepared by subscription_plan_features but Professional is the only self-service paid launch plan, so no live customer is downgraded or unexpectedly gated in this release.
- This release does not change Revolut/customer-invoice payment configuration.
- Full Next.js build must be run locally because uploaded ZIPs intentionally exclude node_modules.
