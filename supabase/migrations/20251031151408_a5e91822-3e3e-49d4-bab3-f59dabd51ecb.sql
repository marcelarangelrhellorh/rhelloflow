-- Criar tabela de eventos para vagas
CREATE TABLE IF NOT EXISTS public.vaga_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  actor_user_id UUID NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_vaga_eventos_vaga ON public.vaga_eventos(vaga_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.vaga_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usuários autenticados podem ver eventos das vagas)
CREATE POLICY "Usuários autenticados podem ver eventos"
  ON public.vaga_eventos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir eventos"
  ON public.vaga_eventos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.vaga_eventos;