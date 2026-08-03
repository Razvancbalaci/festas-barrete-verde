-- ============================================================
-- Rate limit por IP para inserts anónimos em feedback / negocios
-- Cola no SQL Editor do Supabase e corre (Run).
--
-- Supabase NÃO tem rate limiting nativo por tabela/IP na Data API.
-- Isto usa request.headers (cf-connecting-ip / x-forwarded-for) que o
-- PostgREST expõe em pedidos via API.
--
-- Limites por defeito: máx. 5 inserts / 10 min / IP / tipo de formulário.
-- Autenticados (admin) ficam isentos.
-- ============================================================

create table if not exists public.form_rate_hits (
  id bigserial primary key,
  form_kind text not null check (form_kind in ('feedback', 'negocios')),
  client_ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists form_rate_hits_lookup_idx
  on public.form_rate_hits (form_kind, client_ip, created_at desc);

alter table public.form_rate_hits enable row level security;
-- Sem policies para anon/authenticated → inacessível via Data API.
revoke all on table public.form_rate_hits from anon, authenticated, public;
grant all on table public.form_rate_hits to postgres, service_role;
grant usage, select on sequence public.form_rate_hits_id_seq to postgres, service_role;

create or replace function public.form_client_ip()
returns text
language plpgsql
stable
as $$
declare
  headers json;
  ip text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    headers := null;
  end;

  if headers is null then
    return 'unknown';
  end if;

  ip := nullif(trim(headers->>'cf-connecting-ip'), '');
  if ip is null then
    ip := nullif(trim(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1)), '');
  end if;
  if ip is null then
    ip := nullif(trim(headers->>'x-real-ip'), '');
  end if;

  return coalesce(left(ip, 128), 'unknown');
end;
$$;

revoke all on function public.form_client_ip() from public;
grant execute on function public.form_client_ip() to anon, authenticated, service_role;

create or replace function public.enforce_public_form_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text;
  ip text;
  recent int;
  max_hits constant int := 5;
  window_minutes constant int := 10;
begin
  -- Admin autenticado não conta para o limite público
  if auth.role() = 'authenticated' then
    return new;
  end if;

  kind := tg_argv[0];
  ip := public.form_client_ip();

  select count(*)::int into recent
  from public.form_rate_hits
  where form_kind = kind
    and client_ip = ip
    and created_at > now() - make_interval(mins => window_minutes);

  if recent >= max_hits then
    raise exception 'rate limit exceeded'
      using errcode = 'P0001',
            hint = format('Max %s submissions per %s minutes', max_hits, window_minutes);
  end if;

  insert into public.form_rate_hits (form_kind, client_ip)
  values (kind, ip);

  return new;
end;
$$;

revoke all on function public.enforce_public_form_rate_limit() from public;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row
  execute function public.enforce_public_form_rate_limit('feedback');

drop trigger if exists negocios_rate_limit on public.negocios;
create trigger negocios_rate_limit
  before insert on public.negocios
  for each row
  execute function public.enforce_public_form_rate_limit('negocios');

-- Limpeza ocasional (opcional): apagar hits com mais de 7 dias
-- delete from public.form_rate_hits where created_at < now() - interval '7 days';
