-- ============================================================
-- Alertas automáticos: chave única para regenerar sem duplicar
-- Corre no SQL Editor do Supabase
-- ============================================================

alter table push_schedules
  add column if not exists dedupe_key text;

create unique index if not exists push_schedules_dedupe_key_uidx
  on push_schedules (dedupe_key)
  where dedupe_key is not null;
