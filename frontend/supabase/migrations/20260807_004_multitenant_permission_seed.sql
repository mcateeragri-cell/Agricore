-- AgriCore v1.2 - multi-tenant permission seed hardening.
-- Idempotently records permissions used by company role assignments during
-- self-service signup and by company-scoped operational screens.

insert into public.app_permissions (
  permission_key,
  name,
  description,
  module
)
values
  (
    'ai_diagnostics.use',
    'Use AI diagnostics',
    'Use AgriCore AI diagnostics and guided fault finding.',
    'ai_diagnostics'
  ),
  (
    'calendar.manage',
    'Manage calendar',
    'Create, edit and manage calendar events and scheduling.',
    'calendar'
  ),
  (
    'jobs.edit',
    'Edit jobs',
    'Edit existing job records.',
    'jobs'
  ),
  (
    'jobs.review',
    'Review jobs',
    'Review completed and in-progress jobs.',
    'jobs'
  ),
  (
    'jobs.view_all',
    'View all jobs',
    'View jobs across the active company, subject to role restrictions.',
    'jobs'
  ),
  (
    'service_programmes.manage',
    'Manage service programmes',
    'Create, edit and manage service programmes.',
    'service_programmes'
  ),
  (
    'service_programmes.view',
    'View service programmes',
    'View service programmes and scheduled maintenance.',
    'service_programmes'
  )
on conflict (permission_key) do nothing;
