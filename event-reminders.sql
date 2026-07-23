-- ============================================================
-- Lembretes por evento (push individual, app pode estar fechada)
-- Cola no SQL Editor do Supabase e corre (Run)
-- ============================================================

create table if not exists event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references eventos(id) on delete cascade,
  endpoint text not null references push_subscriptions(endpoint) on delete cascade,
  scheduled_for timestamptz not null,
  title text not null,
  body text not null,
  url text not null default '/',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, endpoint)
);

alter table event_reminders enable row level security;

-- Visitantes agendam / cancelam o próprio lembrete (endpoint do dispositivo)
drop policy if exists "Anyone insert reminders" on event_reminders;
create policy "Anyone insert reminders"
  on event_reminders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone update reminders" on event_reminders;
create policy "Anyone update reminders"
  on event_reminders for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone delete reminders" on event_reminders;
create policy "Anyone delete reminders"
  on event_reminders for delete
  to anon, authenticated
  using (true);

drop policy if exists "Anyone read reminders" on event_reminders;
create policy "Anyone read reminders"
  on event_reminders for select
  to anon, authenticated
  using (true);

-- Índice para o worker processar lembretes a tempo
create index if not exists event_reminders_pending_due
  on event_reminders (scheduled_for)
  where status = 'pending';

-- (Opcional) Cron no Supabase para disparar mesmo sem ninguém na app:
-- Dashboard → Edge Functions → send-push → Schedule
-- Body: { "processReminders": true }
-- Intervalo: cada 1–2 minutos durante as festas
