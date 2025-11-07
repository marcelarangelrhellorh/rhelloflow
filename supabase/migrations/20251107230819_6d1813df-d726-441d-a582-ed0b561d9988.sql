-- ============================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- ============================================

-- 1. PROTEGER share_links - Remover acesso público aos tokens
DROP POLICY IF EXISTS "Anyone can view active share links" ON public.share_links;
DROP POLICY IF EXISTS "Public can view share links" ON public.share_links;

-- Apenas usuários autenticados podem ver share links
CREATE POLICY "Authenticated users can view share links for accessible vagas"
ON public.share_links
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM vagas v 
      WHERE v.id = share_links.vaga_id 
      AND (v.recrutador_id = auth.uid() OR v.cs_id = auth.uid())
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. PROTEGER feedback_requests - Manter apenas validação de token, não exposição pública
-- A política de SELECT pública já existe mas está restrita por expires_at
-- Vamos manter essa política pois é usada pelas edge functions para validar tokens

-- 3. PROTEGER vagas - Adicionar RLS para dados confidenciais
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem ver vagas
CREATE POLICY "Authenticated users can view vagas"
ON public.vagas
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Apenas recrutadores e admins podem inserir vagas
CREATE POLICY "Recruiters and admins can insert vagas"
ON public.vagas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role)
);

-- Apenas recrutadores responsáveis, CS e admins podem atualizar vagas
CREATE POLICY "Responsible users can update vagas"
ON public.vagas
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    recrutador_id = auth.uid() OR
    cs_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Apenas admins podem deletar vagas
CREATE POLICY "Admins can delete vagas"
ON public.vagas
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. PROTEGER users - Adicionar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver usuários ativos
CREATE POLICY "Authenticated users can view active users"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND active = true);

-- Apenas admins podem gerenciar usuários
CREATE POLICY "Admins can manage users"
ON public.users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. PROTEGER vaga_status_ref - Adicionar RLS
ALTER TABLE public.vaga_status_ref ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver status
CREATE POLICY "Authenticated users can view vaga status"
ON public.vaga_status_ref
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Apenas admins podem gerenciar status
CREATE POLICY "Admins can manage vaga status"
ON public.vaga_status_ref
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. HABILITAR proteção contra senhas vazadas
-- Nota: Isso será feito via ferramenta de configuração de auth