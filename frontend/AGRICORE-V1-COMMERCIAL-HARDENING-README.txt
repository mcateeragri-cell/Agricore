AgriCore v1.0 Commercial Hardening
==================================

This full-project build is based on AgriCore-Latest(2).zip.

Commercial hardening completed in this pass:

1. Subscription entitlement ceiling
   - Subscription plans are now a strict allow-list.
   - Company feature overrides can disable an included feature, but cannot unlock a feature that the current plan does not include.
   - Newly registered platform features fail closed for subscription companies until explicitly assigned to a plan.
   - Internal and demo workspaces retain full feature access.

2. Stripe checkout entitlement safety
   - Selecting a different plan before a Stripe subscription exists no longer changes the local company plan before checkout succeeds.
   - Stripe metadata + webhook/sync now activate the selected plan after Stripe creates the subscription.
   - Cancelling checkout therefore cannot grant higher-tier entitlements.

3. Central commercial plan policy
   - Added lib/platform/plan-policy.ts.
   - Starter: £49/month, 2 users, 50 AI diagnostics/month.
   - Professional: £89/month, 1,000 AI diagnostics/month.
   - Enterprise: £225/month, 5,000 AI diagnostics/month.
   - AI route and Billing Centre now share the same allowance policy.

4. Three-tier commercial copy cleanup
   - Pricing FAQs no longer imply every signup is Professional.
   - Demo, Contact and Features trial messaging is plan-neutral.
   - Platform subscription admin now shows Enterprise at £225/month rather than Contact Sales.
   - Welcome/trial email templates support {{plan_name}}.
   - Signup supplies the selected plan name to the welcome email.

5. Existing commercial work preserved
   - Starter -> Professional -> Enterprise next-plan self-service upgrades remain in place.
   - Financial Control remains Enterprise-gated.
   - Stripe billing portal, trial handling, invoice history, failed payment flow and cancellation/reactivation remain intact.

Required existing environment variables for all three self-service plans:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_STARTER_MONTHLY
- STRIPE_PRICE_PROFESSIONAL_MONTHLY
- STRIPE_PRICE_ENTERPRISE_MONTHLY
- NEXT_PUBLIC_APP_URL

Existing migration 20260813_022_commercial_plans_and_ai_usage.sql must already be applied to the production Supabase project.
No additional SQL migration is required by this hardening pass.

Recommended local verification:
1. npm install (if node_modules is not present)
2. Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
3. npm run build

Recommended smoke tests after deployment:
- /pricing shows £49 / £89 / £225.
- Signup from each pricing card carries the selected plan.
- Starter user cannot add a third active user.
- Starter/Professional cannot access Enterprise Financial Control.
- AI allowance is shown in Billing and enforced by AI Workshop.
- Trial user can add Stripe payment method.
- Cancelling a plan-selection checkout does not change the active plan.
- Starter -> Professional upgrade succeeds.
- Professional -> Enterprise upgrade succeeds.
- Stripe billing portal opens and invoices remain available.
