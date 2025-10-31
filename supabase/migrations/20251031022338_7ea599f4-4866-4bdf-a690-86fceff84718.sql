-- View consolidada do dashboard com todos os indicadores principais
create or replace view public.dashboard_overview as
with params as (
  select now() - interval '30 days' as dt_from, now() as dt_to
),

-- 1️⃣ Vagas abertas
vagas_abertas as (
  select count(*)::int as vagas_abertas
  from vagas
  where status not in ('Concluído','Cancelada')
),

-- 2️⃣ Candidatos ativos (excluindo estados finais)
candidatos_ativos as (
  select count(*)::int as candidatos_ativos
  from candidatos
  where status not in ('Contratado','Reprovado rhello','Reprovado Solicitante')
),

-- 3️⃣ Vagas com atenção necessária (abertas há mais de 30 dias úteis)
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

-- 4️⃣ Tempo médio de fechamento (dias corridos últimos 30 dias)
tempo_fechamento as (
  select coalesce(avg(extract(day from (v.status_changed_at - v.criado_em)))::int, 0) as media_dias_fechamento
  from vagas v, params p
  where v.status = 'Concluído'
    and v.status_changed_at between p.dt_from and p.dt_to
),

-- 5️⃣ Taxa de aprovação (últimos 30 dias)
taxa_aprovacao as (
  select coalesce(
    round(100.0 * sum(case when h.resultado = 'Contratado' then 1 else 0 end)::numeric / nullif(count(*),0), 1), 0
  ) as taxa_aprovacao
  from historico_candidatos h, params p
  where h.data between p.dt_from and p.dt_to
    and h.resultado in ('Aprovado','Reprovado','Contratado')
),

-- 6️⃣ Feedbacks pendentes do cliente
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

select
  va.vagas_abertas,
  ca.candidatos_ativos,
  at.vagas_atencao,
  at.ids_vagas_atencao,
  tf.media_dias_fechamento,
  ta.taxa_aprovacao,
  fp.feedbacks_pendentes
from vagas_abertas va,
     candidatos_ativos ca,
     atencao at,
     tempo_fechamento tf,
     taxa_aprovacao ta,
     feedbacks_pendentes fp;