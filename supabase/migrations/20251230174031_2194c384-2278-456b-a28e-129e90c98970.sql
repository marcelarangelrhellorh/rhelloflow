-- Usar uma única transação para todas as operações
-- Primeiro, atualizar as vagas para usar slugs que existem na tabela de referência atual

-- a_iniciar -> discovery (discovery já existe)
UPDATE vagas SET status_slug = 'discovery', status_order = 1, status = 'Discovery'
WHERE status_slug = 'a_iniciar';

-- aguardando_retorno_cliente -> entrevistas_rhello (existe na ref atual)
UPDATE vagas SET status_slug = 'entrevistas_rhello', status_order = 5
WHERE status_slug = 'aguardando_retorno_cliente';

-- Agora, adicionar os novos slugs à tabela de referência
-- Usando orders que não existem ainda
INSERT INTO vaga_status_ref (slug, label, "order", kind, color) VALUES
  ('entrevistas', 'Entrevistas', 50, 'normal', '#FB923C'),
  ('shortlist_disponivel', 'Shortlist disponível', 51, 'normal', '#10B981')
ON CONFLICT (slug) DO NOTHING;

-- Atualizar as vagas com entrevistas_rhello para o novo slug entrevistas
UPDATE vagas SET status_slug = 'entrevistas', status_order = 4, status = 'Entrevistas'
WHERE status_slug = 'entrevistas_rhello';

-- Agora podemos deletar os registros antigos e recriar
-- Primeiro, remover os registros que não precisamos mais
DELETE FROM vaga_status_ref WHERE slug NOT IN (
  SELECT DISTINCT status_slug FROM vagas WHERE status_slug IS NOT NULL
);

-- Atualizar os orders para as etapas restantes
UPDATE vaga_status_ref SET "order" = 1 WHERE slug = 'discovery';
UPDATE vaga_status_ref SET "order" = 2 WHERE slug = 'divulgacao';
UPDATE vaga_status_ref SET "order" = 3 WHERE slug = 'triagem';
UPDATE vaga_status_ref SET "order" = 4 WHERE slug = 'entrevistas';
UPDATE vaga_status_ref SET "order" = 5 WHERE slug = 'shortlist_disponivel';
UPDATE vaga_status_ref SET "order" = 6 WHERE slug = 'concluida';
UPDATE vaga_status_ref SET "order" = 7 WHERE slug = 'congelada';
UPDATE vaga_status_ref SET "order" = 8 WHERE slug = 'cancelada';

-- Inserir as etapas que estão faltando
INSERT INTO vaga_status_ref (slug, label, "order", kind, color) VALUES
  ('divulgacao', 'Divulgação', 2, 'normal', '#0EA5E9'),
  ('congelada', 'Congelada', 7, 'frozen', '#94A3B8'),
  ('cancelada', 'Cancelada', 8, 'canceled', '#EF4444')
ON CONFLICT (slug) DO UPDATE SET 
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  color = EXCLUDED.color;