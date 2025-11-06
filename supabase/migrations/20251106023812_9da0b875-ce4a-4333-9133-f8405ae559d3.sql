-- Criar trigger para notificar sobre candidaturas via share link
CREATE TRIGGER trigger_notify_new_share_application
  AFTER INSERT ON public.candidatos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_share_application();