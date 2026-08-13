AgriCore Commercial Conversion Sprint

SAFE FRONTEND PATCH
Extract this ZIP over:
C:\projects\Agricore\frontend

Changes:
- Adds /roi-calculator
- Adds interactive agricultural-engineering business-case calculator
- Adds ROI section to public homepage
- Adds ROI link to public header and footer
- Adds ROI page to sitemap
- Adds docs/launch/LAUNCH-TODAY-CHECKLIST.md

No SQL migration.
No new environment variables.

After extraction:
1. Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
2. npm.cmd run build
3. If clean, commit/push and deploy to Vercel.

The ROI calculator is explicitly illustrative and does not promise guaranteed savings or revenue.
