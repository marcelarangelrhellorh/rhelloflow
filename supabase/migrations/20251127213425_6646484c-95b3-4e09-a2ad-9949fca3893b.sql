-- =============================================
-- CORREÇÃO 7: Candidatos via Share Links
-- Garantir que share links não exponham dados de candidatos
-- =============================================

-- Criar view segura de candidatos para share links (apenas dados públicos)
CREATE OR REPLACE VIEW public.candidatos_public_view 
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.nome_completo,
  c.cidade,
  c.estado,
  c.nivel,
  c.area,
  c.status,
  c.vaga_relacionada_id,
  c.criado_em
  -- Excluir: email, telefone, linkedin, curriculo_url, pretensao_salarial, etc.
FROM public.candidatos c
WHERE c.deleted_at IS NULL;

-- =============================================
-- CORREÇÃO 8: Feedbacks - Rate Limiting via RLS
-- Adicionar proteção contra spam
-- =============================================

-- Criar função para verificar rate limiting de feedbacks
CREATE OR REPLACE FUNCTION public.can_submit_feedback(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_existing_count INT;
BEGIN
  -- Buscar o request de feedback
  SELECT * INTO v_request
  FROM public.feedback_requests
  WHERE id = p_request_id
    AND expires_at > now();
  
  -- Se não existe ou expirou, negar
  IF v_request IS NULL THEN
    RETURN false;
  END IF;
  
  -- Contar feedbacks existentes para este request
  SELECT COUNT(*) INTO v_existing_count
  FROM public.feedbacks
  WHERE request_id = p_request_id;
  
  -- Se allow_multiple = false e já existe feedback, negar
  IF v_request.allow_multiple = false AND v_existing_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Se allow_multiple = true, limitar a 10 feedbacks por request
  IF v_existing_count >= 10 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Atualizar política de INSERT em feedbacks para usar rate limiting
DROP POLICY IF EXISTS "Public can submit feedback via token" ON public.feedbacks;

CREATE POLICY "Public can submit feedback via valid token with rate limit" 
ON public.feedbacks 
FOR INSERT 
WITH CHECK (
  -- Permitir se for usuário autenticado com role adequado
  (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR
    has_role(auth.uid(), 'cs'::app_role)
  ))
  OR
  -- Ou se for via token válido com rate limiting
  (request_id IS NOT NULL AND can_submit_feedback(request_id))
);

-- =============================================
-- CORREÇÃO 9: Empresas RLS - Fortalecer política
-- =============================================

DROP POLICY IF EXISTS "Clientes podem ver sua própria empresa" ON public.empresas;

-- Política mais restritiva - verificação direta de empresa_id
CREATE POLICY "Clientes podem ver apenas sua empresa vinculada" 
ON public.empresas 
FOR SELECT 
USING (
  id = (
    SELECT p.empresa_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

-- =============================================
-- CORREÇÃO 10: vaga_status_ref - Restringir a roles internos
-- =============================================

DROP POLICY IF EXISTS "Autenticados podem ver status reference" ON public.vaga_status_ref;
DROP POLICY IF EXISTS "Authenticated users can view vaga status" ON public.vaga_status_ref;

-- Apenas usuários internos podem ver os status
CREATE POLICY "Internal users can view vaga status" 
ON public.vaga_status_ref 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

-- Clientes também precisam ver status (para acompanhamento)
CREATE POLICY "Clients can view vaga status for tracking" 
ON public.vaga_status_ref 
FOR SELECT 
USING (
  has_role(auth.uid(), 'client'::app_role)
);