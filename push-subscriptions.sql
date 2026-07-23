-- ============================================================
-- Notificações push (PWA)
-- Cola no SQL Editor do Supabase e corre (Run)
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Qualquer visitante pode subscrever (anon)
drop policy if exists "Anyone can subscribe" on push_subscriptions;
create policy "Anyone can subscribe"
  on push_subscriptions for insert
  to anon, authenticated
  with check (true);

-- Atualizar a mesma endpoint (re-subscribe)
drop policy if exists "Anyone can upsert own endpoint" on push_subscriptions;
create policy "Anyone can upsert own endpoint"
  on push_subscriptions for update
  to anon, authenticated
  using (true)
  with check (true);

-- Remover a própria subscrição
drop policy if exists "Anyone can delete subscriptions" on push_subscriptions;
create policy "Anyone can delete subscriptions"
  on push_subscriptions for delete
  to anon, authenticated
  using (true);

-- SELECT necessário para updates por endpoint (e contagem no admin)
drop policy if exists "Auth can read subscriptions" on push_subscriptions;
drop policy if exists "Anyone can read subscriptions" on push_subscriptions;
create policy "Anyone can read subscriptions"
  on push_subscriptions for select
  to anon, authenticated
  using (true);
