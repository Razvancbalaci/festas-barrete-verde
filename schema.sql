-- Cola isto no SQL Editor do Supabase (só a criação da tabela, sem dados)
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  dia date not null,
  hora text not null,
  titulo text not null,
  local text,
  categoria text not null,
  ordem int default 0,
  subtitulo text,
  descricao text,
  bilhetes_url text,
  created_at timestamptz default now()
);

alter table eventos enable row level security;

create policy "leitura publica" on eventos for select using (true);
create policy "escrita admin" on eventos for insert with check (auth.role() = 'authenticated');
create policy "editar admin" on eventos for update using (auth.role() = 'authenticated');
create policy "apagar admin" on eventos for delete using (auth.role() = 'authenticated');
