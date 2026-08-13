AgriCore World Launch Tracking Patch
===================================

Purpose
-------
Adds consent-aware conversion measurement to the public AgriCore marketing site so paid advertising can be evaluated by demos and trials instead of clicks alone.

Included
--------
- Optional Google Analytics support
- Optional Meta Pixel support
- Optional LinkedIn Insight support
- Optional Microsoft Clarity support
- Opt-in analytics cookie/storage banner
- Trial CTA click tracking
- Demo CTA click tracking
- Product demo click tracking
- Pricing click tracking
- Demo request submitted conversion
- Trial signup created conversion
- Clearer Book Demo CTA in the marketing header
- Updated Cookie Policy describing optional analytics
- docs/launch/CONVERSION-TRACKING-SETUP.md

Important
---------
All tracking integrations are disabled by default.
They load only if the relevant NEXT_PUBLIC_* environment variable exists AND the visitor accepts analytics.

Optional Vercel variables
-------------------------
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
NEXT_PUBLIC_META_PIXEL_ID
NEXT_PUBLIC_LINKEDIN_PARTNER_ID
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID
NEXT_PUBLIC_CLARITY_PROJECT_ID

No SQL migration is required.

Install
-------
Extract this patch over:
C:\projects\Agricore\frontend

Then run:
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Do not add analytics IDs until you are ready to configure the relevant advertising/analytics accounts.
