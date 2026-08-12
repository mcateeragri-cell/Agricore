AgriCore Project Atlas — Invoice taxName scope hotfix

CAUSE
The invoice detail page correctly obtained taxName from useRegionalFormatters(),
but the tax-rate UI is rendered inside the child InvoiceTab component.
taxName was therefore outside that component's scope.

FIX
- Pass taxName from InvoiceDetailPage to InvoiceTab.
- Add taxName to InvoiceTab's destructured props.
- Add taxName: string to the InvoiceTab prop type.
- Keep the company-aware regional tax label (VAT / GST / Sales Tax etc.).

No SQL migration.
No environment changes.

INSTALL
Extract over:
C:\projects\Agricore\frontend

Then run:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
