-- Atualizar a função handle_new_user para incluir o mapeamento do role 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles com role padrão 'recrutador'
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into users (SEM a coluna role que não existe)
  INSERT INTO public.users (id, email, name, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- Insert into user_roles com mapeamento correto, incluindo 'client'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'admin' THEN 'admin'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'recrutador' THEN 'recrutador'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'cs' THEN 'cs'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'client' THEN 'client'::app_role
      ELSE 'viewer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;