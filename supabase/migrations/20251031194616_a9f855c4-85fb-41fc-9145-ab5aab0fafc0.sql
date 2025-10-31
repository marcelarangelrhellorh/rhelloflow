-- Criar tabela de referência para status de vagas
CREATE TABLE IF NOT EXISTS public.vaga_status_ref (
  slug text PRIMARY KEY,
  label text NOT NULL,
  "order" integer NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('normal', 'final', 'frozen', 'paused', 'canceled')),
  color text NOT NULL
);

-- Inserir os 13 status padronizados
INSERT INTO public.vaga_status_ref (slug, label, "order", kind, color) VALUES
  ('a_iniciar', 'A iniciar', 1, 'normal', '#16A34A'),
  ('discovery', 'Discovery', 2, 'normal', '#2563EB'),
  ('divulgacao', 'Divulgação', 3, 'normal', '#0EA5E9'),
  ('triagem', 'Triagem', 4, 'normal', '#7C3AED'),
  ('entrevistas_rhello', 'Entrevistas rhello', 5, 'normal', '#FB923C'),
  ('aguardando_retorno_cliente', 'Aguardando retorno do cliente', 6, 'normal', '#F59E0B'),
  ('apresentacao_candidatos', 'Apresentação de candidatos', 7, 'normal', '#10B981'),
  ('entrevistas_solicitante', 'Entrevistas solicitante', 8, 'normal', '#14B8A6'),
  ('em_processo_contratacao', 'Em processo de contratação', 9, 'normal', '#6366F1'),
  ('concluida', 'Concluída', 10, 'final', '#22C55E'),
  ('congelada', 'Congelada', 11, 'frozen', '#94A3B8'),
  ('pausada', 'Pausada', 12, 'paused', '#E5E7EB'),
  ('cancelada', 'Cancelada', 13, 'canceled', '#EF4444')
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  "order" = EXCLUDED."order",
  kind = EXCLUDED.kind,
  color = EXCLUDED.color;

-- Adicionar campos status_slug e status_order na tabela vagas se não existirem
ALTER TABLE public.vagas 
  ADD COLUMN IF NOT EXISTS status_slug text,
  ADD COLUMN IF NOT EXISTS status_order integer;

-- Criar função para mapear status legado para slug
CREATE OR REPLACE FUNCTION map_legacy_status_to_slug(old_status text)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN old_status = 'A iniciar' THEN 'a_iniciar'
    WHEN old_status = 'Discovery' THEN 'discovery'
    WHEN old_status = 'Divulgação' THEN 'divulgacao'
    WHEN old_status = 'Triagem' THEN 'triagem'
    WHEN old_status = 'Entrevistas Rhello' OR old_status = 'Entrevistas rhello' THEN 'entrevistas_rhello'
    WHEN old_status = 'Aguardando retorno do cliente' THEN 'aguardando_retorno_cliente'
    WHEN old_status = 'Apresentação de Candidatos' OR old_status = 'Apresentação de candidatos' THEN 'apresentacao_candidatos'
    WHEN old_status = 'Entrevista cliente' OR old_status = 'Entrevistas solicitante' THEN 'entrevistas_solicitante'
    WHEN old_status = 'Em processo de contratação' THEN 'em_processo_contratacao'
    WHEN old_status = 'Concluído' OR old_status = 'Concluída' THEN 'concluida'
    WHEN old_status = 'Congelada' THEN 'congelada'
    WHEN old_status = 'Pausada' THEN 'pausada'
    WHEN old_status = 'Cancelada' THEN 'cancelada'
    ELSE 'a_iniciar' -- default para valores não reconhecidos
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrar dados existentes para os novos campos
UPDATE public.vagas v
SET 
  status_slug = map_legacy_status_to_slug(v.status::text),
  status_order = (SELECT "order" FROM public.vaga_status_ref WHERE slug = map_legacy_status_to_slug(v.status::text))
WHERE status_slug IS NULL OR status_order IS NULL;

-- Definir valores padrão para novas vagas
ALTER TABLE public.vagas 
  ALTER COLUMN status_slug SET DEFAULT 'a_iniciar',
  ALTER COLUMN status_order SET DEFAULT 1;

-- Adicionar constraint de foreign key
ALTER TABLE public.vagas
  ADD CONSTRAINT fk_vagas_status_slug 
  FOREIGN KEY (status_slug) 
  REFERENCES public.vaga_status_ref(slug);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vagas_status_order ON public.vagas(status_order);
CREATE INDEX IF NOT EXISTS idx_vagas_status_slug ON public.vagas(status_slug);

-- Habilitar RLS na tabela vaga_status_ref
ALTER TABLE public.vaga_status_ref ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública da tabela de referência (somente leitura)
CREATE POLICY "Anyone can view vaga status reference"
  ON public.vaga_status_ref
  FOR SELECT
  USING (true);

-- Comentários para documentação
COMMENT ON TABLE public.vaga_status_ref IS 'Tabela de referência para status padronizados de vagas';
COMMENT ON COLUMN public.vagas.status_slug IS 'Slug do status da vaga (referencia vaga_status_ref)';
COMMENT ON COLUMN public.vagas.status_order IS 'Ordem do status no funil (para ordenação)';