AgriCore v1.3 — Customer & Machine Centre 2.0

This release builds on the existing advanced machine centre and upgrades customer profiles into a 360-degree business workspace.

Customer profile improvements:
- Real company-scoped open/completed job counts.
- Lifetime invoiced value and outstanding balance for financially authorised roles.
- Accepted/converted quote signal.
- Recent customer activity timeline combining jobs, machines, quotes and invoices.
- Direct drill-down links into the underlying job, machine, quote and invoice records.
- Quick workspace links for creating jobs, invoices/quotes and scheduling.
- Financial metrics automatically hidden from users who cannot view financial information.
- Existing customer edit and machine-add workflows retained.
- Removed the old hard-coded £0 outstanding/open-job placeholders.

Machine centre:
- Existing Machine Intelligence, diagnostics, timeline, health, hour history and service-programme features are preserved.
- Machines continue to open from both the global machine register and customer profile.

Security:
- All new queries are scoped by active company_id and customer_id.
- No SQL migration is required.

Recommended test:
1. Open a customer with historic jobs and invoices.
2. Confirm metrics match the reports/invoice pages.
3. Click a recent job/invoice/quote/machine activity entry.
4. Switch to another company and confirm no customer data crosses tenants.
5. Log in as a technician/apprentice and confirm financial metrics are not shown.
