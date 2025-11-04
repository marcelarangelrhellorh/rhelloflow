-- Create audit events table (append-only, immutable)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor JSONB NOT NULL, -- { id, type, display_name, auth_method }
  action TEXT NOT NULL, -- enum: LOGIN_SUCCESS, ROLE_ASSIGN, CANDIDATE_VIEW, etc.
  resource JSONB NOT NULL, -- { type, id, path }
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  payload JSONB, -- pre/post state or diff
  client JSONB, -- { ip, user_agent }
  prev_hash TEXT, -- links to previous event for chain integrity
  event_hash TEXT NOT NULL, -- hash of this event
  signature_metadata JSONB -- optional: { signer_id, signature, key_id }
);

-- Create index for common queries
CREATE INDEX idx_audit_events_timestamp ON public.audit_events(timestamp_utc DESC);
CREATE INDEX idx_audit_events_actor ON public.audit_events((actor->>'id'));
CREATE INDEX idx_audit_events_action ON public.audit_events(action);
CREATE INDEX idx_audit_events_resource ON public.audit_events((resource->>'type'), (resource->>'id'));
CREATE INDEX idx_audit_events_correlation ON public.audit_events(correlation_id);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit events (service role or authenticated users via function)
CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NO UPDATE OR DELETE - append-only!
-- Any redaction must create a new RECORD_REDACTED event

-- Create a view for recent audit activity (last 90 days hot data)
CREATE OR REPLACE VIEW public.audit_events_recent AS
SELECT * FROM public.audit_events
WHERE timestamp_utc >= NOW() - INTERVAL '90 days'
ORDER BY timestamp_utc DESC;

-- Function to compute event hash (SHA256 of canonical JSON)
CREATE OR REPLACE FUNCTION public.compute_audit_event_hash(
  p_timestamp_utc TIMESTAMPTZ,
  p_actor JSONB,
  p_action TEXT,
  p_resource JSONB,
  p_correlation_id UUID,
  p_payload JSONB,
  p_client JSONB,
  p_prev_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical_json TEXT;
BEGIN
  -- Create canonical JSON string (ordered keys)
  v_canonical_json := jsonb_build_object(
    'timestamp_utc', p_timestamp_utc,
    'actor', p_actor,
    'action', p_action,
    'resource', p_resource,
    'correlation_id', p_correlation_id,
    'payload', COALESCE(p_payload, '{}'::jsonb),
    'client', p_client,
    'prev_hash', COALESCE(p_prev_hash, '')
  )::text;
  
  -- Return SHA256 hash (using pgcrypto extension)
  RETURN encode(digest(v_canonical_json, 'sha256'), 'hex');
END;
$$;

-- Function to get the latest event hash (for chaining)
CREATE OR REPLACE FUNCTION public.get_latest_audit_event_hash()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_hash
  FROM public.audit_events
  ORDER BY timestamp_utc DESC
  LIMIT 1;
$$;

-- Function to log audit event with automatic hash computation
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor JSONB,
  p_action TEXT,
  p_resource JSONB,
  p_correlation_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT NULL,
  p_client JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_timestamp TIMESTAMPTZ;
  v_prev_hash TEXT;
  v_event_hash TEXT;
  v_correlation_id UUID;
BEGIN
  v_timestamp := NOW();
  v_correlation_id := COALESCE(p_correlation_id, gen_random_uuid());
  
  -- Get previous event hash for chain integrity
  v_prev_hash := public.get_latest_audit_event_hash();
  
  -- Compute this event's hash
  v_event_hash := public.compute_audit_event_hash(
    v_timestamp,
    p_actor,
    p_action,
    p_resource,
    v_correlation_id,
    p_payload,
    p_client,
    v_prev_hash
  );
  
  -- Insert the event
  INSERT INTO public.audit_events (
    timestamp_utc,
    actor,
    action,
    resource,
    correlation_id,
    payload,
    client,
    prev_hash,
    event_hash
  ) VALUES (
    v_timestamp,
    p_actor,
    p_action,
    p_resource,
    v_correlation_id,
    p_payload,
    p_client,
    v_prev_hash,
    v_event_hash
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Verification function to check audit chain integrity
CREATE OR REPLACE FUNCTION public.verify_audit_chain(
  p_from_timestamp TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_to_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  is_valid BOOLEAN,
  total_events BIGINT,
  invalid_count BIGINT,
  first_invalid_event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_events BIGINT;
  v_invalid_count BIGINT;
  v_first_invalid UUID;
BEGIN
  -- Count total events in range
  SELECT COUNT(*) INTO v_total_events
  FROM public.audit_events
  WHERE timestamp_utc BETWEEN p_from_timestamp AND p_to_timestamp;
  
  -- Find events with invalid hashes
  WITH events_with_computed AS (
    SELECT
      e.id,
      e.event_hash,
      e.timestamp_utc,
      public.compute_audit_event_hash(
        e.timestamp_utc,
        e.actor,
        e.action,
        e.resource,
        e.correlation_id,
        e.payload,
        e.client,
        e.prev_hash
      ) AS computed_hash
    FROM public.audit_events e
    WHERE e.timestamp_utc BETWEEN p_from_timestamp AND p_to_timestamp
  )
  SELECT COUNT(*), MIN(id)
  INTO v_invalid_count, v_first_invalid
  FROM events_with_computed
  WHERE event_hash != computed_hash;
  
  RETURN QUERY SELECT
    v_invalid_count = 0,
    v_total_events,
    v_invalid_count,
    v_first_invalid;
END;
$$;