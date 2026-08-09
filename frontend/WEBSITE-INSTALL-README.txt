AgriCore Marketing Website
==========================

This release turns the public root route into the AgriCore marketing website and moves the authenticated CRM dashboard to /dashboard.

Public routes added:
  /
  /features
  /pricing
  /contact
  /privacy
  /terms

Existing public routes retained:
  /signup
  /login

Authenticated dashboard:
  /dashboard

Pricing shown:
  Starter: £49/month + VAT
  Professional: £89/month + VAT (recommended / 14-day trial)
  Enterprise: Contact sales

Planned add-ons are displayed as Coming Soon and are not sold through the website yet.

IMPORTANT BEFORE WIDE PUBLIC LAUNCH
-----------------------------------
1. Have the Privacy Policy and Terms of Service reviewed for your final legal, VAT, data-processing and cancellation arrangements.
2. Confirm production NEXT_PUBLIC_APP_URL points to the live Vercel/custom domain.
3. Confirm Stripe live webhook and live Professional Price ID are set in Vercel.
4. Test /, /features, /pricing, /contact, /signup, /login and /dashboard after deployment.
5. Confirm login, onboarding and mobile navigation all return authenticated users to /dashboard.

No database migration is required for the website.
