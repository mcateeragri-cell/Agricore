AgriCore Revolut Current Merchant API Patch
=============================================

Extract this ZIP over:
C:\projects\Agricore\frontend

Changes
-------
1. Updates Revolut Merchant API base URL:
   OLD: /api/1.0
   NEW: /api

2. Fixes Test Revolut connection:
   OLD: GET a made-up /orders/agricore-connection-test-* ID
   NEW: GET /orders?limit=1
   This validates credentials without creating payment data.

3. Updates order external reference payload:
   OLD: merchant_order_ext_ref
   NEW: merchant_order_data.reference

4. Keeps company-level Revolut credentials and Production/Sandbox selection.
   No company is required to use Revolut.

No SQL migration.
No new environment variable.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

After deployment
----------------
1. Company Settings > Payments.
2. Ensure Environment = Production.
3. Ensure the current Production Merchant API Secret key is saved.
4. Click Test Revolut connection.
5. Expected: Connection successful (production).
6. Return to an unpaid invoice and click Create Revolut payment.
7. Confirm a checkout URL opens.

Do not paste secret API keys into logs, Git or ChatGPT.
