-- Create table for persistent rate limiting
CREATE TABLE IF NOT EXISTS public.public_job_submissions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_name TEXT,
  job_title TEXT,
  content_hash TEXT NOT NULL,
  blocked BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.public_job_submissions_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON public.public_job_submissions_log
FOR ALL USING (false);

-- Index for faster lookups
CREATE INDEX idx_submissions_ip_time ON public.public_job_submissions_log(ip_address, submitted_at DESC);
CREATE INDEX idx_submissions_content_hash ON public.public_job_submissions_log(content_hash);

-- Cleanup function to remove old entries (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_submission_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_job_submissions_log
  WHERE submitted_at < NOW() - INTERVAL '7 days';
END;
$$;