-- Fase 1: Criar tabela de relacionamento N:N para múltiplos recrutadores por vaga

-- 1.1 Criar tabela vaga_recrutadores
CREATE TABLE public.vaga_recrutadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  
  UNIQUE(vaga_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_vaga_recrutadores_vaga_id ON public.vaga_recrutadores(vaga_id);
CREATE INDEX idx_vaga_recrutadores_user_id ON public.vaga_recrutadores(user_id);

-- 1.2 RLS
ALTER TABLE public.vaga_recrutadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver recrutadores de vagas"
  ON public.vaga_recrutadores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Recrutadores e admins podem inserir"
  ON public.vaga_recrutadores FOR INSERT
  TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'recrutador'::app_role)
  );

CREATE POLICY "Recrutadores e admins podem atualizar"
  ON public.vaga_recrutadores FOR UPDATE
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'recrutador'::app_role)
  );

CREATE POLICY "Recrutadores e admins podem deletar"
  ON public.vaga_recrutadores FOR DELETE
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'recrutador'::app_role)
  );

-- 1.3 Migrar dados existentes (recrutador_id atual vira o recrutador principal)
INSERT INTO public.vaga_recrutadores (vaga_id, user_id, is_primary)
SELECT id, recrutador_id, true
FROM public.vagas
WHERE recrutador_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT (vaga_id, user_id) DO NOTHING;

-- 1.4 Trigger para sincronizar recrutador principal com campo legado
CREATE OR REPLACE FUNCTION public.sync_recrutador_principal()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um recrutador é marcado como principal, atualiza o campo legado
  IF NEW.is_primary = true THEN
    UPDATE public.vagas 
    SET recrutador_id = NEW.user_id
    WHERE id = NEW.vaga_id;
    
    -- Remove is_primary de outros recrutadores da mesma vaga
    UPDATE public.vaga_recrutadores
    SET is_primary = false
    WHERE vaga_id = NEW.vaga_id AND id != NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_recrutador_principal
  AFTER INSERT OR UPDATE OF is_primary ON public.vaga_recrutadores
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.sync_recrutador_principal();

-- 1.5 View helper para facilitar consultas
CREATE OR REPLACE VIEW public.vw_vaga_recrutadores AS
SELECT 
  vr.id,
  vr.vaga_id,
  vr.user_id,
  vr.is_primary,
  vr.created_at,
  u.name as recrutador_nome,
  u.email as recrutador_email
FROM public.vaga_recrutadores vr
JOIN public.users u ON u.id = vr.user_id;