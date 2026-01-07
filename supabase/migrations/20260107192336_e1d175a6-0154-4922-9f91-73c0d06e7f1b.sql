-- Drop e recriar view vw_vagas_com_stats incluindo data_abertura
DROP VIEW IF EXISTS vw_vagas_com_stats;

CREATE VIEW vw_vagas_com_stats AS
SELECT 
    v.id,
    v.titulo,
    v.empresa,
    v.recrutador,
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
        WHEN jsh.last_stage_change IS NOT NULL THEN (
            SELECT count(*)::integer
            FROM generate_series(
                jsh.last_stage_change::date::timestamp with time zone, 
                CURRENT_DATE::timestamp with time zone, 
                '1 day'::interval
            ) d(d)
            WHERE EXTRACT(isodow FROM d.d) < 6::numeric
        )
        ELSE 0
    END AS dias_etapa_atual
FROM vagas v
LEFT JOIN (
    SELECT 
        candidatos.vaga_relacionada_id,
        count(*)::integer AS candidatos_count
    FROM candidatos
    WHERE candidatos.deleted_at IS NULL
    GROUP BY candidatos.vaga_relacionada_id
) c ON c.vaga_relacionada_id = v.id
LEFT JOIN LATERAL (
    SELECT job_stage_history.changed_at AS last_stage_change
    FROM job_stage_history
    WHERE job_stage_history.job_id = v.id
    ORDER BY job_stage_history.changed_at DESC
    LIMIT 1
) jsh ON true;