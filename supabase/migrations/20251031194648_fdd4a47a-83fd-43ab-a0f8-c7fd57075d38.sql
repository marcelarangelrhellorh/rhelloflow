-- Corrigir função para incluir search_path seguro
CREATE OR REPLACE FUNCTION map_legacy_status_to_slug(old_status text)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN old_status = 'A iniciar' THEN 'a_iniciar'
    WHEN old_status = 'Discovery' THEN 'discovery'
    WHEN old_status = 'Divulgação' THEN 'divulgacao'
    WHEN old_status = 'Triagem' THEN 'triagem'
    WHEN old_status = 'Entrevistas Rhello' OR old_status = 'Entrevistas rhello' THEN 'entrevistas_rhello'
    WHEN old_status = 'Aguardando retorno do cliente' THEN 'aguardando_retorno_cliente'
    WHEN old_status = 'Apresentação de Candidatos' OR old_status = 'Apresentação de candidatos' THEN 'apresentacao_candidatos'
    WHEN old_status = 'Entrevista cliente' OR old_status = 'Entrevistas solicitante' THEN 'entrevistas_solicitante'
    WHEN old_status = 'Em processo de contratação' THEN 'em_processo_contratacao'
    WHEN old_status = 'Concluído' OR old_status = 'Concluída' THEN 'concluida'
    WHEN old_status = 'Congelada' THEN 'congelada'
    WHEN old_status = 'Pausada' THEN 'pausada'
    WHEN old_status = 'Cancelada' THEN 'cancelada'
    ELSE 'a_iniciar'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;