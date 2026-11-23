
-- Patch 010: Atomic, idempotent breakdown-to-job creation.
-- The jobs.job_sequence column is GENERATED ALWAYS AS IDENTITY.
-- PostgreSQL must generate its value automatically.
-- This migration is for source control; the fix is already live in Supabase.

ALTER TABLE public.machine_operator_submissions
  ADD COLUMN IF NOT EXISTS created_job_id uuid
  REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS machine_operator_submissions_created_job_id_unique
  ON public.machine_operator_submissions(created_job_id)
  WHERE created_job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.agricore_create_job_from_operator_breakdown(
  p_report_id uuid,
  p_company_id uuid,
  p_allowed_branch_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  job_id uuid,
  job_number text,
  already_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_report public.machine_operator_submissions%ROWTYPE;
  v_machine public.machines%ROWTYPE;
  v_job_id uuid;
  v_job_number text;
  v_priority text;
BEGIN
  -- Only the authenticated server endpoint may call this function.
  -- Browser/client roles must not be allowed to execute it.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required'
      USING ERRCODE = '42501';
  END IF;

  IF p_report_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Missing report or company';
  END IF;

  -- Lock the report to prevent concurrent duplicate job creation.
  SELECT *
  INTO v_report
  FROM public.machine_operator_submissions
  WHERE id = p_report_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Breakdown report not found or not owned by company';
  END IF;

  IF v_report.kind <> 'breakdown'
     OR v_report.status = 'rejected' THEN
    RAISE EXCEPTION
      'Only non-rejected breakdowns can create jobs';
  END IF;

  -- Return the existing job if this breakdown was already converted.
  IF v_report.created_job_id IS NOT NULL THEN
    SELECT j.id, j.job_number
    INTO v_job_id, v_job_number
    FROM public.jobs j
    WHERE j.id = v_report.created_job_id
      AND j.company_id = p_company_id;

    IF v_job_id IS NULL THEN
      RAISE EXCEPTION 'Linked job unavailable';
    END IF;

    RETURN QUERY
      SELECT v_job_id, v_job_number, true;

    RETURN;
  END IF;

  -- The machine must belong to the company.
  SELECT *
  INTO v_machine
  FROM public.machines
  WHERE id = v_report.machine_id
    AND company_id = p_company_id;

  IF NOT FOUND OR v_machine.customer_id IS NULL THEN
    RAISE EXCEPTION
      'Machine or customer not available to company';
  END IF;

  -- The customer must also belong to the same company.
  IF NOT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = v_machine.customer_id
      AND c.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION
      'Machine customer does not belong to company';
  END IF;

  -- Enforce the authenticated user's permitted branch scope.
  IF p_allowed_branch_ids IS NOT NULL
     AND (
       v_machine.branch_id IS NULL
       OR NOT v_machine.branch_id = ANY(p_allowed_branch_ids)
     ) THEN
    RAISE EXCEPTION
      'Machine branch outside operational access'
      USING ERRCODE = '42501';
  END IF;

  -- Convert operator severity to job priority.
  v_priority := CASE v_report.severity
    WHEN 'critical' THEN 'urgent'
    WHEN 'high' THEN 'high'
    WHEN 'medium' THEN 'normal'
    ELSE 'low'
  END;

  -- Create the job.
  -- IMPORTANT: job_sequence is GENERATED ALWAYS AS IDENTITY.
  -- Do not explicitly insert job_sequence or call nextval().
  INSERT INTO public.jobs (
    company_id,
    branch_id,
    customer_id,
    machine_id,
    engineer_name,
    priority,
    status,
    fault_reported,
    machine_hours
  )
  VALUES (
    p_company_id,
    v_machine.branch_id,
    v_machine.customer_id,
    v_machine.id,
    NULL,
    v_priority,
    'open',
    left(
      concat_ws(
        E'\n',
        nullif(trim(v_report.description), ''),
        'Reported by operator: ' || v_report.operator_name,
        'Operator report: ' || v_report.id::text
      ),
      5000
    ),
    v_report.hours
  )
  RETURNING id, public.jobs.job_number
  INTO v_job_id, v_job_number;

  -- Link the newly created job to the original breakdown.
  UPDATE public.machine_operator_submissions
  SET
    created_job_id = v_job_id,
    status = 'reviewed'
  WHERE id = v_report.id;

  RETURN QUERY
    SELECT v_job_id, v_job_number, false;
END;
$function$;

-- Restrict execution to the server-side service role.
REVOKE ALL ON FUNCTION
  public.agricore_create_job_from_operator_breakdown(
    uuid, uuid, uuid[]
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.agricore_create_job_from_operator_breakdown(
    uuid, uuid, uuid[]
  )
TO service_role;
