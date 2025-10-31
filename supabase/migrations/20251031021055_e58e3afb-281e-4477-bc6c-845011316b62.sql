-- Permitir inserção pública de vagas (para formulário externo de clientes)
create policy "Permitir inserção pública de vagas"
on public.vagas
for insert
to anon
with check (true);