-- Garantir que a coluna avaliacao existe e tem constraint correto
-- (já existe, mas vamos garantir o constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedbacks' AND column_name = 'avaliacao'
  ) THEN
    ALTER TABLE public.feedbacks 
      ADD COLUMN avaliacao INTEGER CHECK (avaliacao BETWEEN 1 AND 5);
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_candidato_created 
  ON public.feedbacks(candidato_id, criado_em DESC);

-- Criar view para média de avaliações por candidato
CREATE OR REPLACE VIEW public.vw_candidato_rating AS
SELECT 
  f.candidato_id,
  ROUND(AVG(f.avaliacao)::numeric, 1) as media_rating,
  COUNT(*) FILTER (WHERE f.avaliacao IS NOT NULL) as qtd_avaliacoes,
  COUNT(*) as qtd_feedbacks
FROM public.feedbacks f
GROUP BY f.candidato_id;

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.vw_candidato_rating TO authenticated;