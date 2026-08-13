AgriCore Custom Email Domain Wizard
=====================================

Extract over:
C:\projects\Agricore\frontend

What this adds
--------------
- Every company can use AgriCore Email immediately with no DNS setup.
- Companies that own a domain can add it from Administration > Communications.
- AgriCore creates the domain in the platform Resend account.
- DNS records are shown directly in AgriCore.
- The company can trigger verification and refresh status.
- Once verified, the company chooses its own From address, e.g.
  accounts@mcateeragservices.co.uk
- Reply-To can remain a different mailbox, e.g. mcateeragri@gmail.com.
- Email sending automatically falls back to the AgriCore sender unless the
  company's custom domain is fully verified.

Migration
---------
Run:
supabase/migrations/20260813_025_company_custom_email_domains.sql

Important Resend requirement
----------------------------
The platform RESEND_API_KEY in Vercel must have FULL ACCESS, not only
sending access, because AgriCore now uses the Resend Domains API to create,
retrieve and verify customer domains.

No customer ever sees the Resend API key.

McAteer test
------------
1. Run migration 025.
2. Deploy the patch.
3. Administration > Communications > Sender settings.
4. Select "Use my own domain".
5. Enter: mcateeragservices.co.uk
6. Click Generate DNS records.
7. Add those exact records at your DNS provider.
8. Click "I've added the DNS records".
9. Refresh until Domain verified.
10. Set:
    Sender name: McAteer Agricultural Services
    From: accounts@mcateeragservices.co.uk
    Reply-To: mcateeragri@gmail.com
11. Save settings.
12. Send a test email, then resend an invoice.
