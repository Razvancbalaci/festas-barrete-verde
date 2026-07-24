-- ============================================================
-- Desactivar / reactivar dispositivos push (admin)
-- Corre no SQL Editor DEPOIS de push-preferences.sql
-- ============================================================

alter table push_subscriptions
  add column if not exists active boolean not null default true;

create index if not exists push_subscriptions_active_idx
  on push_subscriptions (active)
  where active = true;

-- Upsert volta a activar o dispositivo (re-subscrição / reabrir avisos)
create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_endpoint is null or length(p_endpoint) < 8 or length(p_endpoint) > 2048 then
    raise exception 'invalid endpoint';
  end if;
  if p_p256dh is null or length(p_p256dh) < 8 or length(p_p256dh) > 512 then
    raise exception 'invalid p256dh';
  end if;
  if p_auth is null or length(p_auth) < 4 or length(p_auth) > 512 then
    raise exception 'invalid auth';
  end if;

  insert into push_subscriptions (endpoint, p256dh, auth, user_agent, active)
  values (
    p_endpoint,
    p_p256dh,
    p_auth,
    left(coalesce(p_user_agent, ''), 512),
    true
  )
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    active = true;
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, text, text) from public;
grant execute on function public.upsert_push_subscription(text, text, text, text) to anon, authenticated;

-- Admin autenticado: activar / desactivar todos os dispositivos
create or replace function public.set_all_push_subscriptions_active(p_active boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'unauthorized';
  end if;

  update push_subscriptions set active = coalesce(p_active, false);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.set_all_push_subscriptions_active(boolean) from public;
grant execute on function public.set_all_push_subscriptions_active(boolean) to authenticated;
