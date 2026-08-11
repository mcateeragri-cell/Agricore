AgriCore Global Foundation v1.0.1

Goal
----
Make AgriCore country/currency/locale aware without changing the default experience for UK customers.

UK defaults
-----------
Country: United Kingdom (GB)
Currency: GBP
Locale: en-GB
Time zone: Europe/London
Tax label: VAT
Default tax rate: 20%
Date format: DD/MM/YYYY
Time format: 24-hour
Week starts: Monday
Measurement system: Metric

What this release adds
----------------------
- Per-company regional settings stored on company_settings.
- Regional Settings panel under Settings -> Company.
- Country profiles for GB, IE, US, CA, AU, NZ and ZA.
- Changing country applies sensible defaults which remain editable.
- Central formatCurrency / formatDate / formatDateTime / formatNumber helpers.
- Client hook for company regional settings.
- Executive Dashboard and Revenue Trend now use the active company's currency/locale.
- New company signups explicitly seed UK defaults.
- Demo workspaces explicitly seed UK defaults.
- Any signed-in company member may read regional presentation settings; only users with settings.manage may change them.

Database migration - REQUIRED
-----------------------------
Run this migration in Supabase before deploying the code:

supabase/migrations/20260810_global_regional_foundation.sql

It is idempotent and upgrades existing company_settings rows to UK defaults.

Important tax note
------------------
Tax defaults are convenience starting points, not a tax-compliance engine. Companies can edit the tax name and rate. Canada in particular has province-dependent GST/HST rates, and US sales tax varies by jurisdiction. Country-specific tax automation should be a later compliance module.

Install / test
--------------
1. Extract over C:\projects\Agricore\frontend
2. Run the Supabase migration above.
3. taskkill /F /IM node.exe
4. Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
5. npm.cmd run build
6. npm.cmd run dev -- --webpack
7. Open Settings -> Company -> Regional settings.
8. Confirm existing companies show UK/GBP/VAT defaults.
9. Temporarily switch a test/demo company to Ireland or USA and confirm the preview changes.
10. Check Dashboard currency formatting follows the selected company.
11. Switch back to UK and confirm £ / en-GB formatting returns.

Future stages (not required for the current UK launch)
------------------------------------------------------
- Customer/document-specific currencies and exchange rates.
- Province/state-specific tax engines.
- Full replacement of remaining legacy hard-coded £/VAT labels across every historical component/PDF.
- Language packs / UI translation.
- Regional address/postcode validation and country-specific compliance documents.
