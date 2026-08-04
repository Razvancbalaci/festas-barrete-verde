-- ============================================================
-- Comércio: destaque (topo da lista + destaque visual)
-- Corre no SQL Editor do Supabase (idempotente).
-- ============================================================

alter table public.negocios
  add column if not exists destaque boolean not null default false;

comment on column public.negocios.destaque is
  'Admin: aparece no topo da página de comércio e com destaque visual';

create index if not exists negocios_aprovado_destaque_idx
  on public.negocios (destaque desc, nome asc)
  where aprovado = true;

-- Impedir que candidaturas públicas se auto-destaquem
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'negocios'
  ) then
    execute 'drop policy if exists "negocios submeter" on negocios';
    execute 'drop policy if exists "Public insert pending negocios" on negocios';
    execute 'drop policy if exists "Anyone insert negocios" on negocios';
    execute 'drop policy if exists "Public insert negocios" on negocios';
    execute $p$
      create policy "Public insert pending negocios"
        on negocios for insert
        to anon, authenticated
        with check (
          aprovado = false
          and coalesce(destaque, false) = false
        )
    $p$;
  end if;
exception when others then
  raise notice 'negocios insert policy skipped: %', SQLERRM;
end $$;
