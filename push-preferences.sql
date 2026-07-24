-- ============================================================
-- Preferências de notificações (por tipo de aviso)
-- Corre no SQL Editor DEPOIS de security-hardening.sql
-- ============================================================

-- Tipos: street | corrida | sjoao | broadcast
alter table push_subscriptions
  add column if not exists pref_street boolean not null default true,
  add column if not exists pref_corrida boolean not null default true,
  add column if not exists pref_sjoao boolean not null default true,
  add column if not exists pref_broadcast boolean not null default true;

alter table push_schedules
  add column if not exists category text;

-- Preencher category a partir de dedupe_key antigo (auto:kind:...)
update push_schedules
set category = substring(dedupe_key from '^auto:([a-z]+):')
where category is null
  and dedupe_key ~ '^auto:[a-z]+:';

update push_schedules
set category = 'broadcast'
where category is null;

alter table push_schedules
  alter column category set default 'broadcast';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_schedules_category_check'
  ) then
    alter table push_schedules
      add constraint push_schedules_category_check
      check (category in ('street', 'corrida', 'sjoao', 'broadcast'));
  end if;
end $$;

create or replace function public.get_push_preferences(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sid text;
  row push_subscriptions%rowtype;
begin
  sid := left(trim(coalesce(p_endpoint, '')), 2048);
  if length(sid) < 8 then
    raise exception 'invalid endpoint';
  end if;

  select * into row from push_subscriptions where endpoint = sid;
  if not found then
    return jsonb_build_object(
      'subscribed', false,
      'pref_street', true,
      'pref_corrida', true,
      'pref_sjoao', true,
      'pref_broadcast', true
    );
  end if;

  return jsonb_build_object(
    'subscribed', true,
    'pref_street', row.pref_street,
    'pref_corrida', row.pref_corrida,
    'pref_sjoao', row.pref_sjoao,
    'pref_broadcast', row.pref_broadcast
  );
end;
$$;

revoke all on function public.get_push_preferences(text) from public;
grant execute on function public.get_push_preferences(text) to anon, authenticated;

create or replace function public.update_push_preferences(
  p_endpoint text,
  p_pref_street boolean,
  p_pref_corrida boolean,
  p_pref_sjoao boolean,
  p_pref_broadcast boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sid text;
  updated int;
begin
  sid := left(trim(coalesce(p_endpoint, '')), 2048);
  if length(sid) < 8 then
    raise exception 'invalid endpoint';
  end if;

  update push_subscriptions set
    pref_street = coalesce(p_pref_street, true),
    pref_corrida = coalesce(p_pref_corrida, true),
    pref_sjoao = coalesce(p_pref_sjoao, true),
    pref_broadcast = coalesce(p_pref_broadcast, true)
  where endpoint = sid;

  get diagnostics updated = row_count;
  if updated = 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_subscribed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pref_street', coalesce(p_pref_street, true),
    'pref_corrida', coalesce(p_pref_corrida, true),
    'pref_sjoao', coalesce(p_pref_sjoao, true),
    'pref_broadcast', coalesce(p_pref_broadcast, true)
  );
end;
$$;

revoke all on function public.update_push_preferences(text, boolean, boolean, boolean, boolean) from public;
grant execute on function public.update_push_preferences(text, boolean, boolean, boolean, boolean) to anon, authenticated;
