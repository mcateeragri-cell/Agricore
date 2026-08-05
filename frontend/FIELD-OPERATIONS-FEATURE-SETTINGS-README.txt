AgriCore v1.4 - Company Field Operations Feature Settings

1. Run supabase/migrations/20260804_company_field_operations_settings.sql in Supabase SQL Editor.
2. Extract this pack over the frontend folder.
3. Clear .next and run npm.cmd run build.
4. Open Settings > Company branding and scroll to Field Operations.
5. Configure each company separately.

Features are stored per company. Disabling a feature does not delete historical GPS or travel records. API routes enforce travel timing, GPS coordinate capture, return journey and automatic status settings. Dispatch only loads location data when Live dispatch location is enabled.
