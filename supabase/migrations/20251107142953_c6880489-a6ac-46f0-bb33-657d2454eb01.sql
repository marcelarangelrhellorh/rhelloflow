-- Primeiro, vamos criar o perfil faltante para o usuário existente
INSERT INTO profiles (id, full_name, role, created_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'cs' as role,
  created_at
FROM auth.users 
WHERE id = 'e0931810-431f-481a-82de-49b4b01a3721'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'e0931810-431f-481a-82de-49b4b01a3721')
ON CONFLICT (id) DO NOTHING;

-- Atualizar o trigger para validar se o perfil existe antes de criar notificações
CREATE OR REPLACE FUNCTION notify_job_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notificar se o status mudou E se há recrutador/cs atribuído
  IF OLD.status_slug IS DISTINCT FROM NEW.status_slug THEN
    
    -- Notificar recrutador se houver E se tiver perfil
    IF NEW.recrutador_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      SELECT 
        NEW.recrutador_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      WHERE EXISTS (SELECT 1 FROM profiles WHERE id = NEW.recrutador_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Notificar CS se houver, for diferente do recrutador E se tiver perfil
    IF NEW.cs_id IS NOT NULL AND NEW.cs_id != NEW.recrutador_id THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      SELECT 
        NEW.cs_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      WHERE EXISTS (SELECT 1 FROM profiles WHERE id = NEW.cs_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;