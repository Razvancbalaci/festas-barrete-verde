-- ============================================================
-- Comércio: telefone/email opcionais + notificações agendadas
-- Cola no SQL Editor do Supabase e corre (Run)
-- ============================================================

alter table negocios
  alter column telefone drop not null,
  alter column email drop not null;

create table if not exists push_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table push_schedules enable row level security;

drop policy if exists "Auth read schedules" on push_schedules;
create policy "Auth read schedules"
  on push_schedules for select
  to authenticated
  using (true);

drop policy if exists "Auth insert schedules" on push_schedules;
create policy "Auth insert schedules"
  on push_schedules for insert
  to authenticated
  with check (true);

drop policy if exists "Auth update schedules" on push_schedules;
create policy "Auth update schedules"
  on push_schedules for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Auth delete schedules" on push_schedules;
create policy "Auth delete schedules"
  on push_schedules for delete
  to authenticated
  using (true);

create index if not exists push_schedules_pending_due
  on push_schedules (scheduled_for)
  where status = 'pending';
