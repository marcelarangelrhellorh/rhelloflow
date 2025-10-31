-- Atualizar função para ter search_path fixo (segurança)
create or replace function public.business_days_between(start_date date, end_date date)
returns int 
language sql 
immutable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(start_date, end_date, interval '1 day')::date as d
  )
  select count(*)::int
  from days
  where extract(isodow from d) < 6; -- 1..5 = seg..sex
$$;