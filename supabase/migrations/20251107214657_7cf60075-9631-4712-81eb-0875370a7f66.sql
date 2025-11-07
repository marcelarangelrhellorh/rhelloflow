-- Garantir que o template de reprovação existe (com created_by)
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Buscar um usuário admin para usar como created_by
  SELECT id INTO v_admin_id
  FROM auth.users
  LIMIT 1;

  -- Se não houver usuário, usar um UUID default
  IF v_admin_id IS NULL THEN
    v_admin_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Inserir ou atualizar template
  INSERT INTO public.whatsapp_templates (key, name, content, description, active, created_by, created_at, updated_at)
  VALUES (
    'reprovacao',
    'Reprovação',
    'Olá {{nome}}, infelizmente não seguiremos com sua candidatura para a vaga de {{vaga}}. Agradecemos seu interesse e desejamos sucesso em sua busca!',
    'Template de mensagem para candidatos reprovados',
    true,
    v_admin_id,
    now(),
    now()
  )
  ON CONFLICT (key) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();
END $$;

-- Garantir políticas RLS para whatsapp_sends
DROP POLICY IF EXISTS "Authenticated users can view whatsapp sends" ON public.whatsapp_sends;
DROP POLICY IF EXISTS "Authenticated users can insert whatsapp sends" ON public.whatsapp_sends;
DROP POLICY IF EXISTS "Admins can manage all sends" ON public.whatsapp_sends;

CREATE POLICY "Authenticated users can view whatsapp sends"
ON public.whatsapp_sends
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR 
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "Authenticated users can insert whatsapp sends"
ON public.whatsapp_sends
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sent_by AND
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'recrutador'::app_role))
);

CREATE POLICY "Admins can manage all sends"
ON public.whatsapp_sends
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));