AgriCore Email Provider Architecture Patch
===========================================

Extract over:
C:\projects\Agricore\frontend

What changes
------------
1. AgriCore Email is the default for every company.
2. A company only needs to set:
   - Sender name
   - Reply-To email
3. New customer domains are NOT created inside the central AgriCore Resend account.
4. The Communications UI now explains the optional Bring Your Own Provider route:
   - Microsoft 365
   - Google Workspace
   - Own Resend account
5. Existing already-verified custom-domain senders remain compatible.
6. New/unverified custom-domain selections safely fall back to AgriCore Email.

Why
---
This avoids consuming Resend domain allowance for every AgriCore tenant and keeps
one company's email infrastructure isolated from every other company.

No SQL migration.
No new environment variables.

Recommended platform sender
---------------------------
Use the already verified AgriCore sending domain (for example updates.getagricore.com)
for platform transactional mail.

For each company:
Sender name: Their business name
Reply-To: Their normal business mailbox

Future provider connections
---------------------------
Microsoft 365 / Google Workspace / company-owned Resend should use company-specific
credentials/OAuth. Do not put those credentials in the central AgriCore Resend account.

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
