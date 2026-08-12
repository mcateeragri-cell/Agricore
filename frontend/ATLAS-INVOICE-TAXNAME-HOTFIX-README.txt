AgriCore Atlas — Invoice taxName build hotfix

Problem:
Next.js build failed in app/invoices/[id]/page.tsx because taxName was referenced
in the invoice tax-rate UI but was not available in the component scope.

Fix:
Restores taxName from the existing company-aware useRegionalFormatters() hook:

const { money, date, taxName } = useRegionalFormatters();

This preserves the global regional-settings work (VAT / GST / Sales Tax etc.)
instead of hard-coding "VAT" or "Tax".

No SQL migration.
No new environment variables.

Install:
Extract over C:\projects\Agricore\frontend

Then:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
