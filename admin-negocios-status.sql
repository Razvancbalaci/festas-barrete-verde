-- ============================================================
-- Comércio: rejeição soft + nota admin (sem apagar o pedido)
-- Corre no SQL Editor do Supabase (idempotente).
-- ============================================================

alter table negocios
  add column if not exists rejeitado boolean not null default false;

alter table negocios
  add column if not exists rejeitado_em timestamptz;

alter table negocios
  add column if not exists nota_admin text;

create index if not exists negocios_pending_idx
  on negocios (created_at desc)
  where aprovado = false and rejeitado = false;
