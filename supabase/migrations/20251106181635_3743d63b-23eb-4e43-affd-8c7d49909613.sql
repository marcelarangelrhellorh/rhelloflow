-- Recreate views with explicit SECURITY INVOKER to fix linter warnings
-- This ensures views respect the caller's RLS policies rather than the creator's

-- Recreate dashboard_last30 with SECURITY INVOKER
CREATE OR REPLACE VIEW public.dashboard_last30 
WITH (security_invoker = true)
AS
WITH
  -- Janela de tempo: últimos 30 dias
  w as (
    select 
      now() - interval '30 days' as dt_from, 
      now() as dt_to
  ),
  
  -- 1. Tempo médio de fechamento (vagas concluídas nos últimos 30 dias)
  vagas_fechadas as (
    select 
      v.id,
      v.criado_em::date as dt_inicio,
      jsh.changed_at::date as dt_fim
    from vagas v
    cross join w
    inner join job_stage_history jsh on jsh.job_id = v.id
    where jsh.to_status = 'Concluída'
      and jsh.changed_at between w.dt_from and w.dt_to
  ),
  
  tempo_fechamento as (
    select
      coalesce(avg(public.business_days_between(dt_inicio, dt_fim))::int, 0) as tempo_medio_uteis,
      coalesce(avg(dt_fim - dt_inicio)::int, 0) as tempo_medio_corridos
    from vagas_fechadas
  ),
  
  -- 2. Taxa de aprovação (candidatos concluídos nos últimos 30 dias)
  candidatos_finalizados as (
    select 
      hc.resultado
    from historico_candidatos hc
    cross join w
    where hc.data between w.dt_from and w.dt_to
      and hc.resultado in ('Contratado', 'Aprovado', 'Reprovado')
  ),
  
  taxa_aprovacao as (
    select 
      coalesce(
        100.0 * sum(case when resultado in ('Contratado', 'Aprovado') then 1 else 0 end) 
        / nullif(count(*), 0),
        0
      )::numeric(5,1) as taxa_aprovacao_percent,
      sum(case when resultado in ('Contratado', 'Aprovado') then 1 else 0 end)::int as total_aprovados,
      count(*)::int as total_finalizados
    from candidatos_finalizados
  ),
  
  -- 3. Feedbacks pendentes
  candidatos_aguardando as (
    select 
      c.id as candidato_id,
      c.vaga_relacionada_id,
      c.status,
      coalesce(
        (select max(f.criado_em) 
         from feedbacks f 
         where f.candidato_id = c.id 
           and f.tipo = 'cliente'),
        '1970-01-01'::timestamptz
      ) as ultimo_feedback_cliente
    from candidatos c
    where c.status::text in ('Entrevista Cliente', 'Enviado Cliente')
      and c.vaga_relacionada_id is not null
  ),
  
  feedbacks_pendentes_count as (
    select count(*)::int as feedbacks_pendentes
    from candidatos_aguardando ca
    where ca.ultimo_feedback_cliente < (now() - interval '7 days')
  ),
  
  -- 4. Vagas reabertas
  vagas_reabertas_count as (
    select count(distinct jsh.job_id)::int as vagas_reabertas
    from job_stage_history jsh
    cross join w
    where jsh.changed_at between w.dt_from and w.dt_to
      and (
        (jsh.from_status in ('Concluída', 'Cancelada') and jsh.to_status not in ('Concluída', 'Cancelada'))
        or
        (jsh.to_status = 'A iniciar' and jsh.from_status != 'A iniciar')
      )
  )

SELECT
  tempo_fechamento.tempo_medio_uteis,
  tempo_fechamento.tempo_medio_corridos,
  taxa_aprovacao.taxa_aprovacao_percent,
  taxa_aprovacao.total_aprovados,
  taxa_aprovacao.total_finalizados,
  feedbacks_pendentes_count.feedbacks_pendentes,
  vagas_reabertas_count.vagas_reabertas
FROM tempo_fechamento, taxa_aprovacao, feedbacks_pendentes_count, vagas_reabertas_count;

-- Recreate dashboard_overview with SECURITY INVOKER
CREATE OR REPLACE VIEW public.dashboard_overview
WITH (security_invoker = true)
AS
WITH params as (
  select now() - interval '30 days' as dt_from, now() as dt_to
),

-- 1️⃣ Vagas abertas
vagas_abertas as (
  select count(*)::int as vagas_abertas
  from vagas
  where status not in ('Concluído','Cancelada')
),

-- 2️⃣ Candidatos ativos
candidatos_ativos as (
  select count(*)::int as candidatos_ativos
  from candidatos
  where status not in ('Contratado','Reprovado rhello','Reprovado Solicitante')
),

-- 3️⃣ Vagas com atenção necessária
dias as (
  select generate_series((now() - interval '90 days')::date, now()::date, interval '1 day')::date as d
),
uteis as (
  select d from dias where extract(isodow from d) < 6
),
vagas_uteis as (
  select v.id,
         count(u.d)::int as dias_uteis_aberta
  from vagas v
  join uteis u on u.d between v.criado_em::date and now()::date
  where v.status not in ('Concluído','Cancelada')
  group by v.id
),
atencao as (
  select count(*)::int as vagas_atencao,
         coalesce(array_agg(id) filter (where id is not null), array[]::uuid[]) as ids_vagas_atencao
  from vagas_uteis
  where dias_uteis_aberta > 30
),

-- 4️⃣ Tempo médio de fechamento
tempo_fechamento as (
  select coalesce(avg(extract(day from (v.status_changed_at - v.criado_em)))::int, 0) as media_dias_fechamento
  from vagas v, params p
  where v.status = 'Concluído'
    and v.status_changed_at between p.dt_from and p.dt_to
),

-- 5️⃣ Taxa de aprovação
taxa_aprovacao as (
  select coalesce(
    round(100.0 * sum(case when h.resultado = 'Contratado' then 1 else 0 end)::numeric / nullif(count(*),0), 1), 0
  ) as taxa_aprovacao
  from historico_candidatos h, params p
  where h.data between p.dt_from and p.dt_to
    and h.resultado in ('Aprovado','Reprovado','Contratado')
),

-- 6️⃣ Feedbacks pendentes
feedbacks_pendentes as (
  select count(*)::int as feedbacks_pendentes
  from candidatos c
  where c.status = 'Entrevistas Solicitante'
    and not exists (
      select 1 from feedbacks f
      where f.candidato_id = c.id
        and f.tipo = 'cliente'
        and f.criado_em >= c.ultimo_feedback
    )
)

SELECT
  va.vagas_abertas,
  ca.candidatos_ativos,
  at.vagas_atencao,
  at.ids_vagas_atencao,
  tf.media_dias_fechamento,
  ta.taxa_aprovacao,
  fp.feedbacks_pendentes
FROM vagas_abertas va,
     candidatos_ativos ca,
     atencao at,
     tempo_fechamento tf,
     taxa_aprovacao ta,
     feedbacks_pendentes fp;

-- Recreate candidatos_active with SECURITY INVOKER
CREATE OR REPLACE VIEW public.candidatos_active
WITH (security_invoker = true)
AS
SELECT * FROM public.candidatos
WHERE deleted_at IS NULL;

-- Recreate candidates_with_tags with SECURITY INVOKER
CREATE OR REPLACE VIEW public.candidates_with_tags
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tag_id', t.id,
        'label', t.label,
        'category', t.category
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::jsonb
  ) as tags
FROM public.candidatos c
LEFT JOIN public.candidate_tags ct ON ct.candidate_id = c.id
LEFT JOIN public.tags t ON t.id = ct.tag_id
GROUP BY c.id;

-- Grant SELECT to authenticated users (access still controlled by underlying table RLS)
GRANT SELECT ON public.dashboard_last30 TO authenticated;
GRANT SELECT ON public.dashboard_overview TO authenticated;
GRANT SELECT ON public.candidatos_active TO authenticated;
GRANT SELECT ON public.candidates_with_tags TO authenticated;