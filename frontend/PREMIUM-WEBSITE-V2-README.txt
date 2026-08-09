AgriCore Premium Marketing Website v2
=====================================

What changed
- Premium homepage presentation with stronger agricultural-service positioning.
- Desktop business overview plus technician phone mock-up.
- Sector strip for agricultural engineers, machinery dealers, dairy service teams, groundcare, plant/field service and workshops.
- Refined feature cards, workflow section, trust/value section and launch FAQ.
- Stronger Professional trial CTA and pricing presentation.
- More polished marketing header/footer.
- Subtle motion with prefers-reduced-motion support.
- Includes the corrected /dashboard relative imports from the post-v1 build fix.

No SQL migration required.

Install
1. Extract over C:\projects\Agricore\frontend
2. Run: Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
3. Run: npm.cmd run build
4. Run: npm.cmd run dev -- --webpack
5. Smoke test /, /features, /pricing, /contact, /login, /signup, /dashboard and /platform.
