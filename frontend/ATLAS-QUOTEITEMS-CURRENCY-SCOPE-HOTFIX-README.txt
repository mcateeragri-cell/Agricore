AgriCore Project Atlas — QuoteItems currency scope hotfix

CAUSE
QuoteItems obtained currencySymbol and the regional money formatter in the
parent QuoteItems component, but the Unit cost / Unit price fields and line
total are rendered inside the child QuoteItemRow component.

That child therefore could not see currencySymbol, causing:
Cannot find name 'currencySymbol'

FIX
QuoteItemRow now reads the existing company-aware regional formatter itself:

const { money: formatCurrency, currencySymbol } =
  useRegionalFormatters();

This fixes both:
- currencySymbol for Unit cost / Unit price
- regional money formatting for the line total

No hard-coded GBP/£ is introduced.
No SQL migration.
No environment changes.

INSTALL
Extract over:
C:\projects\Agricore\frontend

Then:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
