AgriCore First 100 Customers Patch
=================================

Purpose
-------
Add the first-customer acquisition layer needed to support paid ads and direct outreach without changing stable operational app workflows.

What changed
------------
- New /founding-customers public page
- Founding Customer Programme linked from marketing header/footer
- Homepage commercial CTA linked to founding-customer programme
- Contact page early-customer callout
- Sitemap updated
- First 100 Customers commercial playbook
- Direct outreach email + LinkedIn sequences
- 20-minute demo call runbook
- Same-day Google / Meta / LinkedIn ad launch checklist

No SQL migration is required.
No environment variables are added by this patch.

Install
-------
Extract this patch over:
C:\projects\Agricore\frontend

Then run:
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

The ZIP is a FRONTEND PATCH, not a full AgriCore project replacement.
