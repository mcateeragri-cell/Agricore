AgriCore RC-3 Billing Access Hotfix

WHY THIS IS NEEDED
The RC-3 upload contained an older /api/billing/access route which only exempted demo-* slugs.
It did not honour the RC-1.1 companies.billing_mode field, so an internal company with an old/cancelled
subscription row could be incorrectly blocked by SubscriptionAccessGate.

THIS PATCH
- Makes companies.billing_mode the source of truth.
- internal => permanent full access
- demo => permanent full demo access
- subscription => normal trial/Stripe enforcement
- Retains demo-* slug fallback.
- Uses the latest subscription row if multiple historical rows ever exist.

NO SQL REQUIRED.

INSTALL
Extract over:
C:\projects\Agricore\frontend

Then:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run dev -- --webpack

TEST
1. McAteer Agricultural Services => full access.
2. Glenagri Dairy Services => full access.
3. Demo company => full access.
4. Cancelled subscription test company => remains blocked as expected.
