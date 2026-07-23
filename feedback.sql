-- ============================================================
-- Problemas / sugestões do público
-- Cola no SQL Editor do Supabase e corre (Run)
-- ============================================================

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('problema', 'sugestao')),
  mensagem text not null,
  contacto text,
  created_at timestamptz not null default now(),
  lido boolean not null default false
);

alter table feedback enable row level security;

drop policy if exists "Anyone can send feedback" on feedback;
create policy "Anyone can send feedback"
  on feedback for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Auth can read feedback" on feedback;
create policy "Auth can read feedback"
  on feedback for select
  to authenticated
  using (true);

drop policy if exists "Auth can update feedback" on feedback;
create policy "Auth can update feedback"
  on feedback for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Auth can delete feedback" on feedback;
create policy "Auth can delete feedback"
  on feedback for delete
  to authenticated
  using (true);
