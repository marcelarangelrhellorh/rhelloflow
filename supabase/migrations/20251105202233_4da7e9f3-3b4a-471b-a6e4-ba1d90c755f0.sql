-- Add missing columns to share_links table
ALTER TABLE public.share_links
ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS note text;

-- Create share_link_audit table for tracking all actions
CREATE TABLE IF NOT EXISTS public.share_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid REFERENCES public.share_links(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address text
);

-- Enable RLS on share_link_audit
ALTER TABLE public.share_link_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_link_audit
CREATE POLICY "Authenticated users can view audit logs"
ON public.share_link_audit
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert audit logs"
ON public.share_link_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_share_link_audit_share_link_id 
ON public.share_link_audit(share_link_id);

CREATE INDEX IF NOT EXISTS idx_share_links_vaga_id_active 
ON public.share_links(vaga_id, active) WHERE deleted = false;