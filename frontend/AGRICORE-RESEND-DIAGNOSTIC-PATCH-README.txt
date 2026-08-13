AgriCore Resend Diagnostic Patch
=================================

Extract this ZIP over:
C:\projects\Agricore\frontend

Purpose
-------
Replaces the generic/misleading Resend domain error message with the exact
safe response returned by Resend:

- HTTP status
- HTTP status text
- Resend error type/code (when supplied)
- Resend message

The RESEND_API_KEY, Authorization header and other secrets are never included.

No SQL migration.
No environment variable changes.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

After deploy
------------
Administration > Communications > Use my own domain

Try adding:
mcateeragservices.co.uk

Copy the exact new red error message back to ChatGPT if it still fails.
