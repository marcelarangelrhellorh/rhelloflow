-- Recriar função com referência explícita à extensão pgcrypto
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
SET search_path = public, pg_catalog, extensions
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
  
  -- Return SHA256 hash using pgcrypto
  RETURN encode(digest(v_canonical_json::bytea, 'sha256'), 'hex');
END;
$$;