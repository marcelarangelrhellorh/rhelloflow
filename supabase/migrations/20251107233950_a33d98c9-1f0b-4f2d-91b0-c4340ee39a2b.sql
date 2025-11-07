-- Corrigir recursão infinita nas políticas RLS de vagas e share_links

-- Passo 1: Remover políticas duplicadas e problemáticas da tabela vagas
DROP POLICY IF EXISTS "Authenticated users can view vagas" ON public.vagas;
DROP POLICY IF EXISTS "Admins can delete vagas" ON public.vagas;
DROP POLICY IF EXISTS "Recruiters and admins can insert vagas" ON public.vagas;
DROP POLICY IF EXISTS "Responsible users can update vagas" ON public.vagas;
DROP POLICY IF EXISTS "Public can view vagas via active share links" ON public.vagas;

-- Passo 2: Remover política problemática de share_links que causa recursão
DROP POLICY IF EXISTS "Authenticated users can view share links for accessible vagas" ON public.share_links;

-- Passo 3: Criar função SECURITY DEFINER para verificar share links sem recursão
CREATE OR REPLACE FUNCTION public.has_active_share_link(p_vaga_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM share_links
    WHERE vaga_id = p_vaga_id
      AND active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Passo 4: Recriar política de vagas para public usando função SECURITY DEFINER (sem recursão)
CREATE POLICY "Public can view vagas via active share links v2"
ON public.vagas
FOR SELECT
TO public
USING (public.has_active_share_link(id));

-- Passo 5: Criar política simplificada para share_links sem recursão
CREATE POLICY "Authenticated users can view share links for their vagas"
ON public.share_links
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      -- Usar direct check sem invocar políticas de vagas
      SELECT 1 FROM vagas v
      WHERE v.id = vaga_id
        AND (v.recrutador_id = auth.uid() OR v.cs_id = auth.uid())
    )
  )
);

-- Comentário: As políticas vagas_select_authenticated, vagas_delete_admins_only,
-- vagas_insert_recruiters_admins, e vagas_update_recruiters_admins permanecem ativas
-- e fornecem as permissões necessárias sem recursão.