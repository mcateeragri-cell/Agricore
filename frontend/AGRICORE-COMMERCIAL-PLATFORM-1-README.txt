AgriCore Commercial Platform 1.0
================================

Pricing
- Starter: £49/month + tax
- Professional: £89/month + tax
- Enterprise: £225/month + tax
- 14-day trial on all public plans

What this patch adds
- Starter, Professional and Enterprise become public commercial plans.
- Public pricing page links directly to the selected plan trial.
- Signup preserves the selected plan.
- Billing Centre shows plan comparison and live workspace usage.
- Existing Stripe subscribers can upgrade Starter -> Professional -> Enterprise.
- Upgrades use the Stripe subscription price change with immediate proration/invoicing.
- Starter user limit is enforced at 2 active users.
- AI Workshop Assistant usage is metered monthly.
- AI allowances: Starter 50/month, Professional 1,000/month, Enterprise 5,000/month.
- Advanced Financial Control remains Enterprise-only.
- Unreleased Customer Portal / Fleet Management remain disabled.

Migration
Run:
supabase/migrations/20260813_022_commercial_plans_and_ai_usage.sql

Vercel environment variables
Each plan needs a Stripe recurring monthly Price ID:
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_PROFESSIONAL_MONTHLY
STRIPE_PRICE_ENTERPRISE_MONTHLY

The Professional variable already existed in AgriCore. Create Starter (£49 monthly) and Enterprise (£225 monthly) recurring prices in Stripe, then add their Price IDs to Vercel.

Build
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
