AgriCore World Launch Marketing Pack
===================================

Purpose
-------
This is a controlled FRONTEND PATCH for the current build-clean AgriCore project.
Extract it over:

  C:\projects\Agricore\frontend

Do NOT extract it over C:\projects\Agricore because this ZIP is frontend-relative.

What changed
------------
1. Added industry-specific public landing pages:
   /industries
   /industries/agricultural-engineers
   /industries/machinery-dealers
   /industries/mobile-service-engineers
   /industries/dairy-service

2. Homepage improvements:
   - Industry names now link to relevant landing pages.
   - Added AI Workshop Assistant positioning.
   - Trial CTA now presents all three plans rather than only Professional.

3. Marketing navigation:
   - Added Industries.

4. SEO:
   - Added industry landing pages to sitemap.xml.
   - Each new landing page has its own title, description and canonical URL.

5. Advertising launch kit:
   docs/launch/GOOGLE-ADS-ASSETS.csv
   docs/launch/META-ADS-ASSETS.csv
   docs/launch/LINKEDIN-ADS-ASSETS.csv
   docs/launch/AD-LAUNCH-PLAYBOOK.md

The Google, Meta and LinkedIn copy has been prepared to fit the current key ad text/recommended truncation limits checked during this build.

Database
--------
No new SQL migration is required for this patch.

Environment variables
---------------------
No new environment variables are required.

Build
-----
After extraction:

  cd C:\projects\Agricore\frontend
  Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
  npm.cmd run build

The changed TS/TSX files were syntax-transpiled successfully before packaging.
Your local Next.js production build remains the final authoritative build test.

Recommended smoke test
----------------------
1. Open /
2. Open /industries
3. Open each of the four industry pages.
4. Confirm Start Free Trial links open signup.
5. Confirm Request a tailored demo opens /contact.
6. Open /sitemap.xml and confirm the industry URLs are present.
7. Confirm mobile marketing navigation still scrolls cleanly.
