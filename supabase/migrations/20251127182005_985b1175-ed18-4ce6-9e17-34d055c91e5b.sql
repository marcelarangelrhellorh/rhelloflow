-- Fix foreign key constraint to allow share_links deletion
-- When a share_link is deleted, set the source_link_id to NULL in candidatos

-- Drop existing constraint
ALTER TABLE public.candidatos
DROP CONSTRAINT IF EXISTS candidatos_source_link_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE public.candidatos
ADD CONSTRAINT candidatos_source_link_id_fkey
FOREIGN KEY (source_link_id)
REFERENCES public.share_links(id)
ON DELETE SET NULL;