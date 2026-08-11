AgriCore v1.0 — Public Demo Shell Hotfix

Problem:
The public /demo page itself was unauthenticated, but the global AppShell still wrapped it.
That displayed the normal AgriCore application sidebar. Clicking those sidebar links correctly
sent an unauthenticated prospect to the login page.

Fix:
- Adds /demo to AppShell shelllessRoutes.
- The public demo now displays only the marketing header and its own safe read-only demo navigation.
- No protected application sidebar is shown.
- No authentication/security rules are weakened.
- The internal demo tabs remain client-side only and never query real company data.

NO SQL OR ENVIRONMENT CHANGES REQUIRED.

INSTALL:
Extract over:
C:\projects\Agricore\frontend

TEST LOCALLY:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

Then open:
http://localhost:3000/demo

Expected:
- No AgriCore authenticated app sidebar on the left.
- Marketing navigation remains.
- Dashboard / Customers / Machines / Jobs / Invoices / Reports buttons inside the demo card work without login.

DEPLOY:
From C:\projects\Agricore\frontend:
git add Components/AppShell.tsx
git commit -m "Keep public demo outside authenticated app shell"
git push origin main
