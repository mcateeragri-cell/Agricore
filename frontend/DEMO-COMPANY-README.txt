AgriCore Demo Company Generator

Added:
- Platform -> Demo companies
- Create Green Valley Agri Services Ltd demo workspace
- Reset demo sample data without deleting the workspace
- Delete demo workspace
- Demo banner whenever a demo company is active
- Platform-admin-only API protection
- No SQL migration required

Seeded sample data per demo:
- 24 customer businesses
- 72 machines across major agricultural brands
- 140 jobs with realistic statuses, priorities and faults
- 30 quotes plus quote lines
- 76 invoices plus invoice lines
- labour history for report metrics
- 16 stock items
- 6 suppliers
- 8 purchase orders plus receipt progress

Important:
- Demo companies are identified by a slug beginning demo-.
- The signed-in Platform Administrator is added as Company Administrator so the workspace can be opened through the normal company switcher.
- Demo records use example.invalid email addresses and clearly identify themselves as sample data.
- Demo companies are deliberately not connected to Stripe and do not create real subscriptions.
- The generator does not create fake login accounts for technicians; realistic engineer names are used throughout jobs and labour history instead.

Test sequence:
1. npm.cmd run build
2. npm.cmd run dev -- --webpack
3. Open /platform/demo-companies as AgriCore Super Admin / Platform Admin
4. Click Create Green Valley demo
5. Use the normal company switcher to select Green Valley Agri Services Ltd
6. Verify the amber Demo Company banner appears
7. Check Dashboard, Customers, Machines, Jobs, Quotes, Invoices, Stock and Reports
8. Return to /platform/demo-companies and test Reset data
9. Verify other companies are unaffected
10. Test Delete demo only after you are finished with the demo workspace
