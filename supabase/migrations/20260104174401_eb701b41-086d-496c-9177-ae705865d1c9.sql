-- Remover a coluna recommendation da tabela candidate_scorecards
ALTER TABLE public.candidate_scorecards 
DROP COLUMN IF EXISTS recommendation;

-- Remover o enum scorecard_recommendation
DROP TYPE IF EXISTS public.scorecard_recommendation;