-- Corrigir a view para usar SECURITY INVOKER (padrão mais seguro)
-- Isso faz com que a view respeite as permissões do usuário que a consulta

DROP VIEW IF EXISTS public.vagas_public_view;

CREATE VIEW public.vagas_public_view 
WITH (security_invoker = true) AS
SELECT 
  id,
  titulo,
  empresa,
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