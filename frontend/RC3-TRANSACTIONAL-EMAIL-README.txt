AgriCore RC-3 — Transactional Email & Communications

WHAT THIS RELEASE ADDS
- Resend-backed transactional email service using the Resend HTTP API
- Company-branded HTML + plain-text emails
- Communications Centre at /administration/communications
- Sender name and reply-to settings per company
- Editable per-company template overrides
- Built-in templates for welcome, staff invitation, trial reminders, billing events, quotes, invoices, payment reminders, service reminders and job assignment
- Test-email sender
- Email delivery history
- Resend delivery/open/click/bounce/failure webhook processing
- Bounce/complaint suppression
- Resend idempotency keys
- Invoice emailing with invoice/service-report PDF attachment
- Quote email action
- Welcome email after public signup
- Staff-invitation email after adding a user
- Stripe payment success/failure/cancellation emails
- Daily trial-reminder endpoint with Vercel Cron configuration

REQUIRED DATABASE MIGRATION
supabase/migrations/20260810_007_rc3_transactional_email.sql

REQUIRED VERCEL PRODUCTION VARIABLES
RESEND_API_KEY=re_...
AGRICORE_EMAIL_FROM=AgriCore <notifications@YOUR_VERIFIED_SENDING_DOMAIN>
RESEND_WEBHOOK_SECRET=whsec_...
CRON_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://app.getagricore.com

RECOMMENDED SENDING DOMAIN
Verify a dedicated transactional subdomain such as:
updates.getagricore.com

Example From:
AgriCore <notifications@updates.getagricore.com>

RESEND WEBHOOK
https://app.getagricore.com/api/communications/resend-webhook

Recommended events:
email.sent
email.delivered
email.delivery_delayed
email.failed
email.bounced
email.complained
email.suppressed
email.opened
email.clicked

SUPABASE AUTH EMAILS
Supabase Auth still owns verification and password-reset emails.
Configure Supabase Auth custom SMTP / Resend integration for production delivery.

Resend SMTP:
Host: smtp.resend.com
Port: 465 or 587
Username: resend
Password: your Resend API key
Sender: address on the verified domain

INSTALL
Extract over:
C:\projects\Agricore\frontend

Then:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

ACCEPTANCE TEST
1. Run migration.
2. Configure Resend env vars.
3. Open Administration -> Communications.
4. Save sender/reply-to settings.
5. Send a test email.
6. Check Email History.
7. Send a test invoice and confirm the PDF arrives.
8. Send a test quote.
9. Add a test staff user and confirm invitation email.
10. Create a fresh signup and confirm welcome email.
11. Configure Resend webhook and confirm sent -> delivered tracking.
12. Test Stripe test-mode payment success/failure notifications.
13. Test trial reminder endpoint with CRON_SECRET.

NOTES
- No marketing/newsletter system is included; RC-3 is transactional only.
- Per-company custom From domains are prepared but not automatically verified in RC-3.
- At launch, use one central verified AgriCore sending domain and per-company Reply-To addresses.
