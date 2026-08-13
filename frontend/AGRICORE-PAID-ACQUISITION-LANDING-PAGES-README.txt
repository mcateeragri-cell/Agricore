AgriCore paid-acquisition landing page pack

What changed
- Added /agricultural-engineering-software
- Added /farm-machinery-workshop-software
- Added /mobile-job-sheets-agricultural-engineers
- Added /machinery-service-management-software
- Added the new routes to sitemap.xml
- Added high-intent solution links to the public footer
- Added docs/launch/GOOGLE-ADS-CAMPAIGN-BUILD.md
- Added docs/launch/PAID-LANDING-PAGES.csv

Why
The existing industry pages are strong audience pages. These new pages map more directly to high-intent Google searches so paid traffic can land on copy that matches the search rather than a generic homepage.

No SQL migration is required.
No new environment variables are required.

Build check
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
