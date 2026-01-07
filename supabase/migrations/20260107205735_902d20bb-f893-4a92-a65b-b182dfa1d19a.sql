-- Atualizar view para buscar nome do recrutador corretamente
CREATE OR REPLACE VIEW public.vw_vagas_com_stats AS
SELECT 
    v.id,
    v.titulo,
    v.empresa,
    -- Buscar nome do recrutador principal da nova tabela
    COALESCE(
        (SELECT u.name 
         FROM public.vaga_recrutadores vr 
         JOIN public.users u ON vr.user_id = u.id 
         WHERE vr.vaga_id = v.id AND vr.is_primary = true 
         LIMIT 1),
        -- Fallback: buscar do recrutador_id legado
        (SELECT u.name FROM public.users u WHERE u.id = v.recrutador_id)
    ) AS recrutador,
    v.cs_responsavel,
    v.status,
    v.status_slug,
    v.status_order,
    v.complexidade,
    v.prioridade,
    v.criado_em,
    v.data_abertura,
    v.confidencial,
    v.recrutador_id,
    v.cs_id,
    v.deleted_at,
    v.salario_min,
    v.salario_max,
    v.modelo_trabalho,
    COALESCE(c.candidatos_count, 0) AS candidatos_count,
    jsh.last_stage_change,
    CASE
        WHEN jsh.last_stage_change IS NOT NULL THEN 
            (SELECT count(*)::integer 
             FROM generate_series(
                jsh.last_stage_change::date, 
                CURRENT_DATE, 
                '1 day'::interval
             ) d(d)
             WHERE EXTRACT(isodow FROM d.d) < 6)
        ELSE 0
    END AS dias_etapa_atual
FROM public.vagas v
LEFT JOIN (
    SELECT candidatos.vaga_relacionada_id,
           count(*)::integer AS candidatos_count
    FROM public.candidatos
    WHERE candidatos.deleted_at IS NULL
    GROUP BY candidatos.vaga_relacionada_id
) c ON c.vaga_relacionada_id = v.id
LEFT JOIN LATERAL (
    SELECT job_stage_history.changed_at AS last_stage_change
    FROM public.job_stage_history
    WHERE job_stage_history.job_id = v.id
    ORDER BY job_stage_history.changed_at DESC
    LIMIT 1
) jsh ON true;