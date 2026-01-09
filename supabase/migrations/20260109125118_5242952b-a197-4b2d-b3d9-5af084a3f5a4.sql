-- Atualizar order das etapas existentes para abrir espaço
UPDATE public.vaga_status_ref SET "order" = 9 WHERE slug = 'cancelada';
UPDATE public.vaga_status_ref SET "order" = 8 WHERE slug = 'congelada';
UPDATE public.vaga_status_ref SET "order" = 7 WHERE slug = 'concluida';

-- Inserir nova etapa "Entrevista cliente"
INSERT INTO public.vaga_status_ref (slug, label, "order", kind, color)
VALUES ('entrevista_cliente', 'Entrevista cliente', 6, 'normal', '#8B5CF6')
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  "order" = EXCLUDED."order",
  kind = EXCLUDED.kind,
  color = EXCLUDED.color;

-- Atualizar status_order nas vagas existentes para refletir nova ordem
UPDATE public.vagas SET status_order = 7 WHERE status_slug = 'concluida';
UPDATE public.vagas SET status_order = 8 WHERE status_slug = 'congelada';
UPDATE public.vagas SET status_order = 9 WHERE status_slug = 'cancelada';