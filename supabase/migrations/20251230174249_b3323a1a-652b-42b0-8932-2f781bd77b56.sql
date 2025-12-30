-- Atualizar a função map_legacy_status_to_slug para os novos mapeamentos
CREATE OR REPLACE FUNCTION public.map_legacy_status_to_slug(old_status text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE 
    WHEN old_status = 'A iniciar' THEN 'discovery'
    WHEN old_status = 'Discovery' THEN 'discovery'
    WHEN old_status = 'Divulgação' THEN 'divulgacao'
    WHEN old_status = 'Triagem' THEN 'triagem'
    WHEN old_status IN ('Entrevistas Rhello', 'Entrevistas rhello', 'Entrevista cliente', 
                        'Entrevistas solicitante', 'Aguardando retorno do cliente', 'Entrevistas') THEN 'entrevistas'
    WHEN old_status IN ('Apresentação de Candidatos', 'Apresentação de candidatos', 
                        'Em processo de contratação', 'Shortlist disponível') THEN 'shortlist_disponivel'
    WHEN old_status IN ('Concluído', 'Concluída') THEN 'concluida'
    WHEN old_status = 'Congelada' THEN 'congelada'
    WHEN old_status = 'Pausada' THEN 'congelada'
    WHEN old_status = 'Cancelada' THEN 'cancelada'
    ELSE 'discovery'
  END;
END;
$function$;