AgriCore Multi-Company Job Creation Fix

Install:
1. Extract this ZIP into C:\projects\Agricore\frontend
2. Allow app\jobs\new\page.tsx to overwrite.
3. Run:
   taskkill /F /IM node.exe
   Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
   npm.cmd run build
   npm.cmd run dev

What this fixes:
- Customers are filtered by the active company.
- Machines are filtered by the active company.
- Engineers are loaded from active company member profiles.
- New jobs are saved with the active company_id.
- McAteer data cannot appear in Glenagri's New Job form through this page.

Test:
- Select Glenagri and open /jobs/new. McAteer customers/machines must not appear.
- Create a Glenagri job and confirm it appears only under Glenagri.
- Switch to McAteer and confirm the Glenagri job disappears.
