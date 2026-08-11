AgriCore v1.0 - Procedural Demo Company Generator

Changes in this build:
- Every new demo company receives a randomly generated synthetic business name.
- Business profile, colours and payment terms vary per demo.
- Customer names/contact names are synthetic and regenerated each time.
- Contact email addresses use example.invalid and phone values are DEMO-only strings.
- Machine registrations and serial numbers always include DEMO and are randomly generated.
- Customer, machine, job, quote, invoice, stock and PO volumes vary within safe ranges.
- Machine make/model/type/year/hours/usage are procedurally varied.
- Jobs, priorities, statuses, engineer allocation and machine relationships are procedurally varied.
- Invoice identifiers use demo-only prefixes and are tied to synthetic customers/jobs.
- Suppliers are synthetic rather than names of real suppliers.
- Stock part references are explicitly DEMO-prefixed.
- Reset Data regenerates the records for the existing demo workspace.

Safety/identity note:
The generator is designed to avoid presenting real farms, people, registrations, serial numbers,
phone numbers or email addresses as demo data. A coincidental similarity in a randomly assembled
business name does not represent a real customer and all machine identifiers are explicitly marked DEMO.

No SQL migration required.

Test:
1. npm.cmd run build
2. npm.cmd run dev -- --webpack
3. Open /platform/demo-companies
4. Create two random demos and confirm company names and counts differ.
5. Switch into each demo and inspect Customers, Machines, Jobs, Quotes, Invoices, Stock and Reports.
6. Reset one demo and confirm its underlying customer/machine/job data changes.
7. Delete unwanted older Green Valley demo workspaces from the same screen.

Identity collision protection:
- Demo company display names contain the word Demo plus a random token.
- Demo customer business names contain Demo plus a random token.
- This is intentional: random generation alone cannot mathematically guarantee a name does not match a real business.
