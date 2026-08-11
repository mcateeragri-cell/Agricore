AgriCore v1.0 Demo Presentation Mode

Purpose
- Prevent the real signed-in platform administrator identity from appearing to prospective customers while presenting a demo workspace.

What changes inside demo workspaces
- Sidebar/user card shows a deterministic synthetic Service Manager identity.
- Real platform role label and real email are hidden.
- My Account is replaced by a non-clickable Demo workspace control.
- Dashboard greeting/avatar uses the synthetic demo identity.
- Technician Status uses a six-person synthetic demo team instead of the real company membership profile.
- Job engineer selectors use synthetic demo team names.
- Labour timer/adjustment actions in a demo record the synthetic demo manager identity.
- Newly-created demo workspace membership profiles store Demo Workspace Manager rather than the platform administrator's personal display name.
- Demo company settings use a reserved example.invalid address rather than the real account email.

Security
- Authentication, real permissions, company isolation and platform administration privileges remain unchanged underneath.
- Presentation mode changes display identity only when the active company slug/name is recognised as a demo workspace.
- Switching back to a real company immediately restores the real logged-in identity.

No SQL migration is required.

Install
Extract over:
C:\projects\Agricore\frontend

Then run:
taskkill /F /IM node.exe
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
npm.cmd run dev -- --webpack

Test
1. Switch into any existing generated demo workspace.
2. Confirm James McAteer / real email / AgriCore Super Administrator are not visible in the sidebar.
3. Confirm Dashboard greeting uses a synthetic Service Manager name.
4. Confirm Team Today lists synthetic demo staff.
5. Open a demo job and confirm engineer dropdowns contain demo staff, not real staff.
6. Switch back to McAteer Agricultural Services and confirm the real account identity returns normally.
