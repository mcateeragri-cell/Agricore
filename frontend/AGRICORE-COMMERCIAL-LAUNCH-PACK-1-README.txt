AgriCore Commercial Launch Pack 1
================================

Extract over:
C:\projects\Agricore\frontend

Adds five high-intent commercial/SEO landing pages and improves search metadata/structured data.

New routes:
/agricultural-crm
/agricultural-invoicing-software
/workshop-scheduling-software
/field-service-management-agriculture
/agricultural-engineer-software

Also updates:
- Homepage title/description/OpenGraph metadata
- Homepage FAQ structured data
- Shared search landing SoftwareApplication structured data
- Footer solution links
- Sitemap
- Paid-search destination map

No SQL migration.
No environment variable changes.

Build:
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
