-- Create feedbacks table
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references public.candidatos(id) on delete cascade,
  vaga_id uuid references public.vagas(id) on delete set null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  
  -- "interno" (somente equipe rhello) | "cliente" (devolutiva do cliente)
  tipo text not null check (tipo in ('interno','cliente')),
  
  -- texto do feedback
  conteudo text not null,
  
  -- metadados opcionais:
  etapa text,
  disposicao text check (disposicao in ('aprovado', 'reprovado', 'neutro')),
  avaliacao int check (avaliacao between 1 and 5),
  
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Indexes
create index if not exists idx_feedbacks_candidato on public.feedbacks (candidato_id);
create index if not exists idx_feedbacks_vaga on public.feedbacks (vaga_id);
create index if not exists idx_feedbacks_criado on public.feedbacks (criado_em desc);

-- Add feedback tracking fields to candidatos
alter table public.candidatos
  add column if not exists ultimo_feedback timestamptz,
  add column if not exists total_feedbacks int not null default 0;

-- Trigger function to maintain feedback metrics
create or replace function public.atualizar_metricas_feedback() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.candidatos
      set ultimo_feedback = coalesce(new.criado_em, now()),
          total_feedbacks = total_feedbacks + 1
    where id = new.candidato_id;
  elsif (tg_op = 'UPDATE') then
    new.atualizado_em := now();
    return new;
  elsif (tg_op = 'DELETE') then
    update public.candidatos c
    set total_feedbacks = greatest(c.total_feedbacks - 1, 0),
        ultimo_feedback = (
          select max(criado_em) from public.feedbacks f
          where f.candidato_id = c.id
        )
    where c.id = old.candidato_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Create trigger
drop trigger if exists trg_feedbacks_atualizacao on public.feedbacks;
create trigger trg_feedbacks_atualizacao
after insert or update or delete on public.feedbacks
for each row execute function public.atualizar_metricas_feedback();

-- Enable RLS
alter table public.feedbacks enable row level security;

-- RLS Policies
create policy "Usuários autenticados podem ver feedbacks"
on public.feedbacks
for select
to authenticated
using (true);

create policy "Usuários autenticados podem criar feedbacks"
on public.feedbacks
for insert
to authenticated
with check (auth.uid() = author_user_id);

create policy "Autores podem atualizar seus feedbacks"
on public.feedbacks
for update
to authenticated
using (auth.uid() = author_user_id);

create policy "Autores podem deletar seus feedbacks"
on public.feedbacks
for delete
to authenticated
using (auth.uid() = author_user_id);

-- Enable realtime
alter publication supabase_realtime add table public.feedbacks;