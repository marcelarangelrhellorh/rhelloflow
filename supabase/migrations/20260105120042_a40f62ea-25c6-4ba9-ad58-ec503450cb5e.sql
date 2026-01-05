-- Tabela para rastrear menções em notas
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioner_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('candidate_note', 'empresa_note', 'job_history')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_entity ON public.mentions(entity_type, entity_id);
CREATE INDEX idx_mentions_mentioner ON public.mentions(mentioner_id);

-- RLS policies
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Permitir insert para usuários autenticados
CREATE POLICY "Users can insert mentions"
ON public.mentions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = mentioner_id);

-- Permitir select para usuários autenticados
CREATE POLICY "Users can view mentions"
ON public.mentions FOR SELECT TO authenticated
USING (true);

-- Permitir delete para quem criou a menção
CREATE POLICY "Users can delete own mentions"
ON public.mentions FOR DELETE TO authenticated
USING (auth.uid() = mentioner_id);