AgriCore v1.0 Commercial Hardening - SAFE PATCH
================================================

BASELINE
Apply this patch ONLY to the build-clean frontend project:
C:\projects\Agricore-Known-Good\frontend

This is a controlled overlay. It contains only the commercial hardening delta
from the latest AgriCore ZIP. It does NOT replace the full project.

Commercial policy
- Starter: £49/month + tax
- Professional: £89/month + tax
- Enterprise: £225/month + tax
- 14-day trial on public plans
- Advanced Financial Control remains Enterprise-only

Hardening included
- Subscription plan becomes the entitlement ceiling.
- Company feature overrides can disable included features but cannot unlock a
  feature excluded by the active subscription plan.
- Unknown/new features fail closed until assigned to a plan.
- Stripe checkout does not grant a new plan before Stripe confirms/syncs it.
- Existing Stripe subscription upgrades continue through the controlled
  subscription update path.
- Stripe sync resolves the AgriCore plan from Stripe plan metadata/price.
- AI diagnostic limits/pricing policy are centralised.
- Public pricing/demo/contact/features copy is aligned with all 3 plans.

Migration
No NEW migration is added by this safe patch.
The existing migration must already have been run:
supabase/migrations/20260813_022_commercial_plans_and_ai_usage.sql

Required Vercel variables
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_PROFESSIONAL_MONTHLY
STRIPE_PRICE_ENTERPRISE_MONTHLY

Do not place Stripe secret keys in client-side NEXT_PUBLIC_ variables.

Apply and verify
1. Extract this ZIP over C:\projects\Agricore-Known-Good\frontend
2. Allow matching files to replace.
3. Keep your existing .env.local untouched.
4. Run:
   Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
5. Do not deploy until that build succeeds.

Smoke tests after deployment
- Starter pricing = £49
- Professional pricing = £89
- Enterprise pricing = £225
- Starter -> Professional upgrade offered
- Professional -> Enterprise upgrade offered
- Cancelled checkout does not change entitlements
- Financial Control unavailable below Enterprise
- AI usage limit messaging matches the active plan
