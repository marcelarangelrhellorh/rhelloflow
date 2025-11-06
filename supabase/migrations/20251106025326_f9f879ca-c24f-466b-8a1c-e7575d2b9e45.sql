-- Criar enum para tipo de escala
CREATE TYPE public.scale_type AS ENUM ('rating_1_5', 'text_options');

-- Criar enum para categorias de critérios
CREATE TYPE public.criteria_category AS ENUM (
  'hard_skills', 
  'soft_skills', 
  'experiencia', 
  'fit_cultural', 
  'outros'
);

-- Criar enum para recomendações
CREATE TYPE public.scorecard_recommendation AS ENUM (
  'strong_yes', 
  'yes', 
  'maybe', 
  'no'
);

-- Tabela de templates de scorecards
CREATE TABLE public.scorecard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de critérios dos templates
CREATE TABLE public.scorecard_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.scorecard_templates(id) ON DELETE CASCADE NOT NULL,
  category criteria_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
  scale_type scale_type DEFAULT 'rating_1_5',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de scorecards preenchidos por candidato
CREATE TABLE public.candidate_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.scorecard_templates(id) NOT NULL,
  evaluator_id UUID REFERENCES auth.users(id) NOT NULL,
  vaga_id UUID REFERENCES public.vagas(id),
  recommendation scorecard_recommendation,
  comments TEXT,
  total_score NUMERIC(5,2),
  match_percentage NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de avaliações individuais por critério
CREATE TABLE public.scorecard_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID REFERENCES public.candidate_scorecards(id) ON DELETE CASCADE NOT NULL,
  criteria_id UUID REFERENCES public.scorecard_criteria(id) NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies para scorecard_templates
CREATE POLICY "Authenticated users can view templates"
  ON public.scorecard_templates FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins and recruiters can manage templates"
  ON public.scorecard_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

-- RLS Policies para scorecard_criteria
CREATE POLICY "Authenticated users can view criteria"
  ON public.scorecard_criteria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and recruiters can manage criteria"
  ON public.scorecard_criteria FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

-- RLS Policies para candidate_scorecards
CREATE POLICY "Authenticated users can view scorecards"
  ON public.candidate_scorecards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Evaluators can create scorecards"
  ON public.candidate_scorecards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = evaluator_id);

CREATE POLICY "Evaluators can update own scorecards"
  ON public.candidate_scorecards FOR UPDATE
  TO authenticated
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Admins can manage all scorecards"
  ON public.candidate_scorecards FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para scorecard_evaluations
CREATE POLICY "Authenticated users can view evaluations"
  ON public.scorecard_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_scorecards
      WHERE id = scorecard_evaluations.scorecard_id
    )
  );

CREATE POLICY "Users can manage evaluations of their scorecards"
  ON public.scorecard_evaluations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_scorecards
      WHERE id = scorecard_evaluations.scorecard_id
      AND evaluator_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_scorecard_templates_updated_at
  BEFORE UPDATE ON public.scorecard_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_scorecards_updated_at
  BEFORE UPDATE ON public.candidate_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão de exemplo
INSERT INTO public.scorecard_templates (name, description, active)
VALUES (
  'Avaliação Técnica Geral',
  'Template padrão para avaliação de candidatos com critérios técnicos e comportamentais',
  true
);

-- Inserir critérios padrão para o template
WITH template AS (
  SELECT id FROM public.scorecard_templates WHERE name = 'Avaliação Técnica Geral' LIMIT 1
)
INSERT INTO public.scorecard_criteria (template_id, category, name, description, weight, display_order)
SELECT 
  t.id,
  unnest(ARRAY['hard_skills'::criteria_category, 'hard_skills', 'soft_skills', 'soft_skills', 'experiencia', 'fit_cultural']),
  unnest(ARRAY['Conhecimento Técnico', 'Capacidade de Resolução de Problemas', 'Comunicação', 'Trabalho em Equipe', 'Experiência Relevante', 'Alinhamento Cultural']),
  unnest(ARRAY[
    'Avalie o domínio técnico do candidato nas competências requeridas',
    'Capacidade de analisar e resolver problemas complexos',
    'Clareza na comunicação oral e escrita',
    'Habilidade de colaborar efetivamente com o time',
    'Experiência prévia relevante para a posição',
    'Fit com os valores e cultura da empresa'
  ]),
  unnest(ARRAY[20, 15, 15, 15, 20, 15]),
  unnest(ARRAY[1, 2, 3, 4, 5, 6])
FROM template t;