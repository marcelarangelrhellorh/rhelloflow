-- =============================================
-- CORREÇÃO 1: Diretório de Usuários Público
-- Removendo política que permite acesso sem autenticação
-- =============================================

DROP POLICY IF EXISTS "users_read_directory" ON public.users;

-- Nova política que exige autenticação
CREATE POLICY "users_read_directory_authenticated" 
ON public.users 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND active = true);

-- =============================================
-- CORREÇÃO 2: Perfis de Staff Expostos
-- Removendo política que expõe perfis rhello sem autenticação
-- =============================================

DROP POLICY IF EXISTS "Users can view rhello profiles" ON public.profiles;

-- Nova política que exige autenticação para ver perfis rhello
CREATE POLICY "Authenticated users can view rhello profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_type = 'rhello');

-- =============================================
-- CORREÇÃO 3: Campos Sensíveis em Share Links
-- Criar view segura para share links (sem campos sensíveis)
-- =============================================

CREATE OR REPLACE VIEW public.vagas_public_view AS
SELECT 
  id,
  titulo,
  empresa,
  -- Excluir campos sensíveis:
  -- motivo_confidencial, solicitante_nome, solicitante_email, 
  -- solicitante_telefone, contato_nome, contato_telefone, contato_email,
  -- salario_min, salario_max (se confidencial)
  CASE WHEN confidencial = true THEN NULL ELSE salario_min END as salario_min,
  CASE WHEN confidencial = true THEN NULL ELSE salario_max END as salario_max,
  salario_modalidade,
  modelo_trabalho,
  tipo_contratacao,
  beneficios,
  beneficios_outros,
  requisitos_obrigatorios,
  requisitos_desejaveis,
  responsabilidades,
  status,
  status_slug,
  criado_em
FROM public.vagas
WHERE deleted_at IS NULL;

-- RLS para a view (herda da tabela base)
-- Share links devem usar esta view em vez da tabela direta

-- =============================================
-- CORREÇÃO 4: Adicionar valor "Concluída" ao enum se necessário
-- Verificar e corrigir inconsistência de enum
-- =============================================

-- Primeiro, vamos verificar os valores atuais e atualizar dados inconsistentes
UPDATE public.vagas 
SET status = 'Concluído'::status_vaga 
WHERE status::text = 'Concluída';

-- =============================================
-- CORREÇÃO 5: Proteção contra Fraude em Analytics
-- Melhorar política de share_link_events
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert share link events" ON public.share_link_events;

-- Nova política que valida se o share_link existe
CREATE POLICY "Valid share links can insert events" 
ON public.share_link_events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.share_links 
    WHERE id = share_link_id 
    AND active = true 
    AND COALESCE(deleted, false) = false
  )
);

-- =============================================
-- CORREÇÃO 6: Audit Log - Restringir inserção
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert audit events" ON public.audit_events;

-- Apenas admins e sistema podem inserir eventos de auditoria
CREATE POLICY "System and admins can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() IS NULL -- service_role (sem auth context)
);