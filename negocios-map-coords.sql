-- ============================================================
-- Coordenadas de mapa para negócios (pins no FestivalMap)
-- Corre no SQL Editor do Supabase.
-- ============================================================

alter table public.negocios
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.negocios.lat is 'Latitude WGS84 para pin no mapa (opcional; só admin)';
comment on column public.negocios.lng is 'Longitude WGS84 para pin no mapa (opcional; só admin)';
