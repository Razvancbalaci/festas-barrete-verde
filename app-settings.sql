-- ============================================================
-- Configuração global da app (flags operacionais)
-- Corre no SQL Editor do Supabase (idempotente).
-- ============================================================

create table if not exists app_config (
  id int primary key default 1 check (id = 1),
  live_smoke_test_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into app_config (id, live_smoke_test_enabled)
values (1, false)
on conflict (id) do nothing;

alter table app_config enable row level security;

drop policy if exists "app config public read" on app_config;
drop policy if exists "app config admin read" on app_config;
-- Só contas autenticadas (back-office) leem a flag — visitantes anónimos nunca vêem o live test.
create policy "app config admin read"
  on app_config for select
  to authenticated
  using (true);

drop policy if exists "app config admin write" on app_config;
create policy "app config admin write"
  on app_config for update
  to authenticated
  using (true)
  with check (true);

create or replace function public.touch_app_config()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_config_touch on app_config;
create trigger app_config_touch
  before update on app_config
  for each row execute function public.touch_app_config();
