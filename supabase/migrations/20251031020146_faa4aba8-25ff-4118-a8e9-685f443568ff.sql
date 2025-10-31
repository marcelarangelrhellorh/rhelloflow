-- Função para calcular dias úteis entre duas datas
create or replace function public.business_days_between(start_date date, end_date date)
returns int 
language sql 
immutable 
as $$
  with days as (
    select generate_series(start_date, end_date, interval '1 day')::date as d
  )
  select count(*)::int
  from days
  where extract(isodow from d) < 6; -- 1..5 = seg..sex
$$;

-- View para dashboard dos últimos 30 dias
create or replace view public.dashboard_last30 as
with
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
  
  -- 3. Feedbacks pendentes (candidatos em etapas que exigem feedback de cliente)
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
  
  -- 4. Vagas reabertas (vagas que mudaram de status nos últimos 30 dias voltando para status anterior)
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

select
  tempo_fechamento.tempo_medio_uteis,
  tempo_fechamento.tempo_medio_corridos,
  taxa_aprovacao.taxa_aprovacao_percent,
  taxa_aprovacao.total_aprovados,
  taxa_aprovacao.total_finalizados,
  feedbacks_pendentes_count.feedbacks_pendentes,
  vagas_reabertas_count.vagas_reabertas
from tempo_fechamento, taxa_aprovacao, feedbacks_pendentes_count, vagas_reabertas_count;

-- Grant access to authenticated users
grant select on public.dashboard_last30 to authenticated;