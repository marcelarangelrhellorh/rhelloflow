-- 1) Tabela tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  slug TEXT GENERATED ALWAYS AS (lower(regexp_replace(label, '\s+', '-', 'g'))) STORED,
  category TEXT NOT NULL CHECK (category IN ('area', 'role', 'skill', 'seniority', 'location')),
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice único para evitar duplicação (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS tags_label_category_unique 
ON public.tags (lower(label), category);

-- 2) Tabela vacancy_tags (vínculo tags <-> vagas)
CREATE TABLE IF NOT EXISTS public.vacancy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (vacancy_id, tag_id)
);

-- 3) Tabela candidate_tags (vínculo tags <-> candidatos)
CREATE TABLE IF NOT EXISTS public.candidate_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  added_reason TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (candidate_id, tag_id)
);

-- 4) View para buscar tags do candidato agregadas
CREATE OR REPLACE VIEW public.view_candidate_tags AS
SELECT 
  c.id AS candidate_id,
  t.id AS tag_id,
  t.label,
  t.category,
  ct.added_by,
  ct.added_at,
  ct.added_reason
FROM public.candidate_tags ct
JOIN public.tags t ON t.id = ct.tag_id
JOIN public.candidatos c ON c.id = ct.candidate_id;

-- 5) View para filtros rápidos (candidatos com tags agregadas em JSONB)
CREATE OR REPLACE VIEW public.candidates_with_tags AS
SELECT 
  c.*,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tag_id', t.id,
        'label', t.label,
        'category', t.category
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::jsonb
  ) AS tags
FROM public.candidatos c
LEFT JOIN public.candidate_tags ct ON ct.candidate_id = c.id
LEFT JOIN public.tags t ON t.id = ct.tag_id
GROUP BY c.id;

-- 6) Função trigger para adicionar tags da vaga ao candidato automaticamente
CREATE OR REPLACE FUNCTION public.fn_add_vacancy_tags_to_candidate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_tag RECORD;
BEGIN
  IF NEW.vaga_relacionada_id IS NOT NULL THEN
    FOR v_tag IN
      SELECT tag_id FROM public.vacancy_tags WHERE vacancy_id = NEW.vaga_relacionada_id
    LOOP
      INSERT INTO public.candidate_tags(candidate_id, tag_id, added_by, added_reason)
      VALUES (NEW.id, v_tag.tag_id, NULL, CONCAT('application_via_vaga:', NEW.vaga_relacionada_id))
      ON CONFLICT (candidate_id, tag_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- 7) Trigger para executar a função ao inserir/atualizar candidato
DROP TRIGGER IF EXISTS trg_add_tags_on_application ON public.candidatos;
CREATE TRIGGER trg_add_tags_on_application
AFTER INSERT OR UPDATE OF vaga_relacionada_id ON public.candidatos
FOR EACH ROW
EXECUTE FUNCTION public.fn_add_vacancy_tags_to_candidate();

-- 8) RLS Policies para tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Recruiters and admins can create tags" ON public.tags;
CREATE POLICY "Recruiters and admins can create tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );

DROP POLICY IF EXISTS "Recruiters and admins can update tags" ON public.tags;
CREATE POLICY "Recruiters and admins can update tags"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );

DROP POLICY IF EXISTS "Admins can delete tags" ON public.tags;
CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9) RLS Policies para vacancy_tags
ALTER TABLE public.vacancy_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view vacancy tags" ON public.vacancy_tags;
CREATE POLICY "Authenticated users can view vacancy tags"
  ON public.vacancy_tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Recruiters and admins can manage vacancy tags" ON public.vacancy_tags;
CREATE POLICY "Recruiters and admins can manage vacancy tags"
  ON public.vacancy_tags FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );

-- 10) RLS Policies para candidate_tags
ALTER TABLE public.candidate_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view candidate tags" ON public.candidate_tags;
CREATE POLICY "Authenticated users can view candidate tags"
  ON public.candidate_tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Recruiters and admins can manage candidate tags" ON public.candidate_tags;
CREATE POLICY "Recruiters and admins can manage candidate tags"
  ON public.candidate_tags FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );

-- 11) Inserir tags iniciais
INSERT INTO public.tags (label, category) 
SELECT * FROM (VALUES
  ('Tecnologia', 'area'),
  ('Vendas', 'area'),
  ('Marketing', 'area'),
  ('Financeiro', 'area'),
  ('Recursos Humanos', 'area'),
  ('Operações', 'area'),
  ('Jurídico', 'area'),
  ('Administrativo', 'area'),
  ('Analista', 'role'),
  ('Coordenador', 'role'),
  ('Gerente', 'role'),
  ('Diretor', 'role'),
  ('Assistente', 'role'),
  ('Supervisor', 'role'),
  ('Especialista', 'role'),
  ('Consultor', 'role'),
  ('Excel', 'skill'),
  ('Power BI', 'skill'),
  ('SQL', 'skill'),
  ('Python', 'skill'),
  ('JavaScript', 'skill'),
  ('React', 'skill'),
  ('Node.js', 'skill'),
  ('Java', 'skill'),
  ('Gestão de Pessoas', 'skill'),
  ('Liderança', 'skill'),
  ('Comunicação', 'skill'),
  ('Negociação', 'skill'),
  ('Júnior', 'seniority'),
  ('Pleno', 'seniority'),
  ('Sênior', 'seniority'),
  ('Trainee', 'seniority'),
  ('Estagiário', 'seniority'),
  ('São Paulo', 'location'),
  ('Rio de Janeiro', 'location'),
  ('Belo Horizonte', 'location'),
  ('Brasília', 'location'),
  ('Remoto', 'location'),
  ('Híbrido', 'location')
) AS v(label, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tags t 
  WHERE lower(t.label) = lower(v.label) AND t.category = v.category
);