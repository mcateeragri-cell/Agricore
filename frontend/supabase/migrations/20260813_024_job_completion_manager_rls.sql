-- AgriCore: allow authorised company management roles to submit job completions.
-- Assigned-technician policies remain in place; this is an additional permissive insert policy.

begin;

drop policy if exists "Managers can create job completions"
on public.job_completions;

create policy "Managers can create job completions"
on public.job_completions
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.jobs j
    where j.id = job_completions.job_id
      and j.company_id = job_completions.company_id
  )
  and exists (
    select 1
    from public.company_member_roles cmr
    where cmr.company_id = job_completions.company_id
      and cmr.user_id = auth.uid()
      and cmr.role in (
        'company_admin',
        'administrator',
        'service_manager',
        'office'
      )
  )
);

commit;
