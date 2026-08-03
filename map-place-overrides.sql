-- ============================================================
-- Overrides + locais custom do mapa (coords / nome / ocultar / novos pins)
-- Sem alterar mapPlaces.js — ideal na semana das festas.
-- Corre no SQL Editor do Supabase (idempotente).
-- ============================================================

create table if not exists map_place_overrides (
  place_id text primary key,
  lat double precision,
  lng double precision,
  name text,
  hidden boolean,
  updated_at timestamptz not null default now()
);

-- Locais criados no admin (não existem em mapPlaces.js)
alter table map_place_overrides add column if not exists kind text;
alter table map_place_overrides add column if not exists is_custom boolean not null default false;
alter table map_place_overrides add column if not exists emoji text;

alter table map_place_overrides enable row level security;

drop policy if exists "map overrides public read" on map_place_overrides;
create policy "map overrides public read"
  on map_place_overrides for select
  to anon, authenticated
  using (true);

drop policy if exists "map overrides admin write" on map_place_overrides;
create policy "map overrides admin write"
  on map_place_overrides for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.touch_map_place_override()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists map_place_overrides_touch on map_place_overrides;
create trigger map_place_overrides_touch
  before update on map_place_overrides
  for each row execute function public.touch_map_place_override();
