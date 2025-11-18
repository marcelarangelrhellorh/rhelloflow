-- Remove a constraint existente
ALTER TABLE public.share_links 
DROP CONSTRAINT IF EXISTS share_links_created_by_fkey;

-- Adiciona a constraint novamente com ON DELETE SET NULL
ALTER TABLE public.share_links
ADD CONSTRAINT share_links_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Faz o mesmo para outras tabelas que possam ter o mesmo problema
ALTER TABLE public.client_view_links 
DROP CONSTRAINT IF EXISTS client_view_links_created_by_fkey;

ALTER TABLE public.client_view_links
ADD CONSTRAINT client_view_links_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;