-- Função RPC única para buscar todos os dados da página Relatórios
create or replace function public.reports_overview(
  start_date date,
  end_date   date,
  recrutador_param text default null,
  cliente_param    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resumo            jsonb;
  v_open_close_weekly jsonb;
  v_tempo_por_rec     jsonb;
  v_funil_etapas      jsonb;
  v_dist_area         jsonb;
  v_sla_gauge         jsonb;
begin
  ------------------------------------------------------------------
  -- 1) Cards resumo
  ------------------------------------------------------------------
  select jsonb_build_object(
    'vagas_abertas', (
      select count(*)
      from vagas v
      where v.status not in ('Concluído','Cancelada')
        and (recrutador_param is null or v.recrutador = recrutador_param)
        and (cliente_param    is null or v.empresa    = cliente_param)
    ),
    'candidatos_ativos', (
      select count(*)
      from candidatos c
      where c.status not in ('Contratado','Reprovado rhello','Reprovado Solicitante')
    ),
    'vagas_atencao', (
      with uteis as (
        select v.id,
               public.business_days_between(v.criado_em::date, coalesce(v.status_changed_at::date, end_date)) as dias
        from vagas v
        where v.status not in ('Concluído','Cancelada')
          and (recrutador_param is null or v.recrutador = recrutador_param)
          and (cliente_param    is null or v.empresa    = cliente_param)
      )
      select count(*) from uteis where dias > 30
    ),
    'ids_vagas_atencao', (
      with uteis as (
        select v.id,
               public.business_days_between(v.criado_em::date, coalesce(v.status_changed_at::date, end_date)) as dias
        from vagas v
        where v.status not in ('Concluído','Cancelada')
          and (recrutador_param is null or v.recrutador = recrutador_param)
          and (cliente_param    is null or v.empresa    = cliente_param)
      )
      select coalesce(jsonb_agg(id), '[]'::jsonb) from uteis where dias > 30
    ),
    'media_dias_fechamento', (
      select coalesce(avg(extract(day from (v.status_changed_at - v.criado_em)))::int, 0)
      from vagas v
      where v.status = 'Concluído'
        and v.status_changed_at is not null
        and v.status_changed_at::date between start_date and end_date
        and (recrutador_param is null or v.recrutador = recrutador_param)
        and (cliente_param    is null or v.empresa    = cliente_param)
    ),
    'taxa_aprovacao', (
      select coalesce(
        round(100.0 * sum(case when h.resultado = 'Contratado' then 1 else 0 end)::numeric 
        / nullif(count(*),0), 1), 0
      )
      from historico_candidatos h
      where h.data between start_date and end_date
        and h.resultado in ('Aprovado','Reprovado','Contratado')
    ),
    'feedbacks_pendentes', (
      select count(*)
      from candidatos c
      where c.status = 'Entrevistas Solicitante'
        and not exists (
          select 1 from feedbacks f
          where f.candidato_id = c.id
            and f.tipo = 'cliente'
            and f.criado_em >= c.criado_em
        )
    )
  )
  into v_resumo;

  ------------------------------------------------------------------
  -- 2) Vagas abertas / fechadas por semana (série)
  ------------------------------------------------------------------
  with semanas as (
    select generate_series(date_trunc('week', start_date)::date,
                           date_trunc('week', end_date)::date,
                           interval '7 days')::date as semana
  ),
  abertas as (
    select date_trunc('week', v.criado_em)::date semana, count(*) qtd
    from vagas v
    where v.criado_em::date between start_date and end_date
      and (recrutador_param is null or v.recrutador = recrutador_param)
      and (cliente_param    is null or v.empresa    = cliente_param)
    group by 1
  ),
  fechadas as (
    select date_trunc('week', v.status_changed_at)::date semana, count(*) qtd
    from vagas v
    where v.status = 'Concluído'
      and v.status_changed_at is not null
      and v.status_changed_at::date between start_date and end_date
      and (recrutador_param is null or v.recrutador = recrutador_param)
      and (cliente_param    is null or v.empresa    = cliente_param)
    group by 1
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'week', to_char(s.semana, 'DD/MM'),
      'opened', coalesce(a.qtd,0),
      'closed', coalesce(f.qtd,0)
    )
    order by s.semana
  ), '[]'::jsonb)
  from semanas s
  left join abertas a  on a.semana  = s.semana
  left join fechadas f on f.semana  = s.semana
  into v_open_close_weekly;

  ------------------------------------------------------------------
  -- 3) Tempo médio de fechamento por recrutador (barras)
  ------------------------------------------------------------------
  select coalesce(jsonb_agg(jsonb_build_object(
    'recruiter', v.recrutador,
    'avg_days', avg(extract(day from (v.status_changed_at - v.criado_em)))::int
  ) order by avg(extract(day from (v.status_changed_at - v.criado_em))) desc), '[]'::jsonb)
  from vagas v
  where v.status = 'Concluído'
    and v.status_changed_at is not null
    and v.status_changed_at::date between start_date and end_date
    and (recrutador_param is null or v.recrutador = recrutador_param)
    and (cliente_param    is null or v.empresa    = cliente_param)
    and v.recrutador is not null
  group by v.recrutador
  into v_tempo_por_rec;

  ------------------------------------------------------------------
  -- 4) Funil por etapa (barras)
  ------------------------------------------------------------------
  select coalesce(jsonb_agg(jsonb_build_object(
    'stage', c.status,
    'count', count(*)
  ) order by count(*) desc), '[]'::jsonb)
  from candidatos c
  where c.criado_em::date between start_date and end_date
  group by c.status
  into v_funil_etapas;

  ------------------------------------------------------------------
  -- 5) Distribuição de candidatos por área (pizza)
  ------------------------------------------------------------------
  select coalesce(jsonb_agg(jsonb_build_object(
    'area', c.area,
    'total', count(*)
  ) order by count(*) desc), '[]'::jsonb)
  from candidatos c
  where c.area is not null
    and c.criado_em::date <= end_date
  group by c.area
  into v_dist_area;

  ------------------------------------------------------------------
  -- 6) SLA gauge (média de dias úteis abertos / limite 30)
  ------------------------------------------------------------------
  select jsonb_build_object(
    'avg_business_days', coalesce((
      select round(avg(public.business_days_between(v.criado_em::date, coalesce(v.status_changed_at::date, end_date))))
      from vagas v
      where v.status not in ('Cancelada')
        and (recrutador_param is null or v.recrutador = recrutador_param)
        and (cliente_param    is null or v.empresa    = cliente_param)
    ),0),
    'limit', 30
  )
  into v_sla_gauge;

  ------------------------------------------------------------------
  -- Resultado final
  ------------------------------------------------------------------
  return jsonb_build_object(
    'summary', v_resumo,
    'series_open_closed', v_open_close_weekly,
    'avg_time_by_recruiter', v_tempo_por_rec,
    'funnel_by_stage', v_funil_etapas,
    'candidates_by_area', v_dist_area,
    'sla', v_sla_gauge
  );
end;
$$;

-- Criar índices para otimizar queries
create index if not exists idx_vagas_criado_em on vagas(criado_em);
create index if not exists idx_vagas_status_changed_at on vagas(status_changed_at);
create index if not exists idx_vagas_recrutador on vagas(recrutador);
create index if not exists idx_vagas_empresa on vagas(empresa);
create index if not exists idx_vagas_status on vagas(status);
create index if not exists idx_candidatos_criado_em on candidatos(criado_em);
create index if not exists idx_candidatos_status on candidatos(status);
create index if not exists idx_candidatos_area on candidatos(area);
create index if not exists idx_historico_data on historico_candidatos(data);
create index if not exists idx_historico_resultado on historico_candidatos(resultado);
create index if not exists idx_feedbacks_candidato on feedbacks(candidato_id, tipo, criado_em);