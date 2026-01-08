-- ============================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS PARA PRODUÇÃO
-- ============================================

-- 1. RECRIAR VIEW SEGURA PARA CANDIDATOS DE CLIENTES
-- Omite dados sensíveis: telefone, email, pretensao_salarial
-- ============================================

DROP VIEW IF EXISTS public.candidatos_public_view CASCADE;

CREATE VIEW public.candidatos_public_view AS
SELECT 
  id,
  nome_completo,
  nivel,
  area,
  status,
  vaga_relacionada_id,
  criado_em,
  cidade,
  estado,
  linkedin,
  curriculo_url,
  portfolio_url,
  pontos_fortes,
  pontos_desenvolver,
  parecer_final,
  disponibilidade_status,
  disponibilidade_mudanca,
  origem,
  is_visible_for_client,
  hired_at,
  deleted_at
FROM public.candidatos
WHERE deleted_at IS NULL;

-- Conceder acesso à view
GRANT SELECT ON public.candidatos_public_view TO authenticated;

-- 2. FUNÇÃO DE RATE LIMIT PARA FEEDBACKS (se não existir)
-- Limita a 10 feedbacks por request_id por hora
-- ============================================

CREATE OR REPLACE FUNCTION public.can_submit_feedback(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_allow_multiple boolean;
BEGIN
  -- Verificar se request existe e não expirou
  SELECT allow_multiple INTO v_allow_multiple
  FROM public.feedback_requests
  WHERE id = p_request_id
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Se não permite múltiplos, verificar se já existe feedback
  IF NOT COALESCE(v_allow_multiple, false) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.feedbacks
    WHERE request_id = p_request_id
      AND deleted_at IS NULL;
    
    IF v_count > 0 THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Rate limit: máximo 10 feedbacks por request por hora
  SELECT COUNT(*) INTO v_count
  FROM public.feedbacks
  WHERE request_id = p_request_id
    AND criado_em > now() - interval '1 hour';
  
  RETURN v_count < 10;
END;
$$;

-- 3. FUNÇÃO PARA VERIFICAR ACESSO A WHATSAPP POR VAGA
-- ============================================

CREATE OR REPLACE FUNCTION public.can_view_whatsapp_send(p_vacancy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vagas
    WHERE id = p_vacancy_id
      AND (
        recrutador_id = auth.uid()
        OR cs_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
  OR p_vacancy_id IS NULL
$$;

-- 4. ATUALIZAR POLÍTICA DE WHATSAPP_SENDS
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view whatsapp sends" ON public.whatsapp_sends;

CREATE POLICY "Users can view whatsapp sends for their jobs"
ON public.whatsapp_sends
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    (public.has_role(auth.uid(), 'recrutador') OR public.has_role(auth.uid(), 'cs'))
    AND public.can_view_whatsapp_send(vacancy_id)
  )
);

-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedbacks_request_criado 
ON public.feedbacks(request_id, criado_em) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_sends_vacancy 
ON public.whatsapp_sends(vacancy_id);

CREATE INDEX IF NOT EXISTS idx_candidatos_public_view_vaga 
ON public.candidatos(vaga_relacionada_id) 
WHERE deleted_at IS NULL;

-- 6. DOCUMENTAÇÃO
-- ============================================

COMMENT ON VIEW public.candidatos_public_view IS 
'View segura para clientes - omite dados sensíveis (telefone, email, salário)';

COMMENT ON FUNCTION public.can_submit_feedback IS 
'Verifica rate limit e permissão para submeter feedback via token';

COMMENT ON FUNCTION public.can_view_whatsapp_send IS 
'Verifica se usuário pode ver logs de WhatsApp de uma vaga específica';