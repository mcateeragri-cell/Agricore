-- Apply AFTER migrations 001, 002 and 003. Idempotent security upgrade.
-- The public API uses service-role access only; never expose the service key.
ALTER TABLE public.machine_operator_attempts
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.machine_operator_submissions
  ADD COLUMN IF NOT EXISTS ip_digest text;
CREATE INDEX IF NOT EXISTS machine_operator_attempts_machine_failed_idx
  ON public.machine_operator_attempts(machine_id, created_at DESC) WHERE verified = false;
CREATE INDEX IF NOT EXISTS machine_operator_submissions_rate_idx
  ON public.machine_operator_submissions(machine_id, ip_digest, created_at DESC);

-- Serialize reservations per machine to avoid concurrent brute-force bypass.
-- Returns NULL when blocked; returns attempt ID when admitted.
CREATE OR REPLACE FUNCTION public.passport_reserve_pin_attempt(
  p_machine_id uuid, p_ip_digest text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id bigint;
  v_since timestamptz := now() - interval '15 minutes';
  v_total bigint;
  v_source bigint;
BEGIN
  IF p_machine_id IS NULL OR p_ip_digest IS NULL OR
     p_ip_digest !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid attempt parameters';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_machine_id::text, 0));
  SELECT count(*) INTO v_total FROM public.machine_operator_attempts
    WHERE machine_id = p_machine_id AND NOT verified AND created_at >= v_since;
  IF v_total >= 40 THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_source FROM public.machine_operator_attempts
    WHERE machine_id = p_machine_id AND ip_digest = p_ip_digest
      AND NOT verified AND created_at >= v_since;
  IF v_source >= 8 THEN RETURN NULL; END IF;
  INSERT INTO public.machine_operator_attempts(machine_id, ip_digest, verified)
    VALUES(p_machine_id, p_ip_digest, false) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.passport_reserve_pin_attempt(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_reserve_pin_attempt(uuid,text) TO service_role;

-- Preserve private-table restrictions.
ALTER TABLE public.machine_operator_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_operator_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.machine_operator_attempts FROM anon, authenticated;
REVOKE ALL ON public.machine_operator_submissions FROM anon, authenticated;
