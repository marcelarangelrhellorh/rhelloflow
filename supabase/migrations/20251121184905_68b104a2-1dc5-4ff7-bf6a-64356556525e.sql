-- Configurar settings para permitir chamadas à edge function
-- Esses valores serão usados pelas funções de notificação para chamar a edge function de email

-- Criar ou atualizar as configurações
DO $$
BEGIN
  -- Configurar URL do Supabase
  PERFORM set_config('app.settings.supabase_url', current_setting('request.env.SUPABASE_URL', true), false);
  
  -- Configurar service role key
  PERFORM set_config('app.settings.service_role_key', current_setting('request.env.SUPABASE_SERVICE_ROLE_KEY', true), false);
EXCEPTION WHEN OTHERS THEN
  -- Se falhar, não é crítico - os emails simplesmente não serão enviados
  RAISE WARNING 'Could not configure email settings: %', SQLERRM;
END;
$$;