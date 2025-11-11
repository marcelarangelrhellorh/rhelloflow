-- =====================================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA CRÍTICAS
-- =====================================================

-- 1. CORRIGIR TABELA VAGAS - Remover acesso público total
-- Problema: Política 'vagas_select_authenticated' com condition 'true' expõe tudo publicamente
DROP POLICY IF EXISTS "vagas_select_authenticated" ON public.vagas;

CREATE POLICY "vagas_select_authenticated" 
ON public.vagas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. CORRIGIR TABELA FEEDBACK_REQUESTS - Proteger tokens de feedback
-- Problema: Política 'Público pode validar token' expõe todos os tokens
DROP POLICY IF EXISTS "Público pode validar token" ON public.feedback_requests;

-- Criar função segura para validar token sem expor a tabela
CREATE OR REPLACE FUNCTION public.validate_feedback_token(p_token text)
RETURNS TABLE(
  id uuid,
  vaga_id uuid,
  candidato_id uuid,
  recrutador_id uuid,
  allow_multiple boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, vaga_id, candidato_id, recrutador_id, allow_multiple, expires_at
  FROM public.feedback_requests
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;
$$;

-- Nova política: apenas recrutadores/admins podem ver a tabela completa
CREATE POLICY "Autenticados podem ver feedback requests"
ON public.feedback_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'recrutador'::app_role)
    OR auth.uid() = recrutador_id
  )
);

-- 3. CORRIGIR TABELA SHARE_LINKS - Proteger tokens de compartilhamento
-- Problema: Política 'Public can view active share links by token' expõe todos os tokens
DROP POLICY IF EXISTS "Public can view active share links by token" ON public.share_links;

-- Criar função segura para buscar share link por token (com colunas corretas)
CREATE OR REPLACE FUNCTION public.get_share_link_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  vaga_id uuid,
  token text,
  active boolean,
  expires_at timestamptz,
  created_at timestamptz,
  share_config jsonb,
  max_submissions integer,
  submissions_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, vaga_id, token, active, expires_at, created_at, 
         share_config, max_submissions, submissions_count
  FROM public.share_links
  WHERE token = p_token
    AND active = true
    AND COALESCE(deleted, false) = false
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- Nova política: apenas usuários autenticados podem ver share links
CREATE POLICY "Autenticados podem ver share links"
ON public.share_links
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política para inserção pública via token (necessário para candidaturas)
CREATE POLICY "Sistema pode inserir eventos de share link"
ON public.share_link_events
FOR INSERT
WITH CHECK (true);

-- 4. CORRIGIR TABELA VAGA_STATUS_REF - Requerer autenticação
DROP POLICY IF EXISTS "Anyone can view vaga status reference" ON public.vaga_status_ref;

CREATE POLICY "Autenticados podem ver status reference"
ON public.vaga_status_ref
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. ADICIONAR COMENTÁRIOS PARA AUDITORIA
COMMENT ON FUNCTION public.validate_feedback_token IS 
  'Função segura para validar tokens de feedback sem expor a tabela completa. Usada por edge functions públicas.';

COMMENT ON FUNCTION public.get_share_link_by_token IS 
  'Função segura para buscar share links por token sem expor todos os links. Usada por edge functions públicas.';