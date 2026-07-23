-- ============================================================
-- Segurança: fechar acessos indevidos (push + lembretes + feedback)
-- Corre no SQL Editor do Supabase DEPOIS dos scripts anteriores.
-- ============================================================

-- ---------- push_subscriptions ----------
-- Remover leitura/escrita aberta; anon só via RPC.
drop policy if exists "Anyone can subscribe" on push_subscriptions;
drop policy if exists "Anyone can upsert own endpoint" on push_subscriptions;
drop policy if exists "Anyone can delete subscriptions" on push_subscriptions;
drop policy if exists "Anyone can read subscriptions" on push_subscriptions;
drop policy if exists "Auth can read subscriptions" on push_subscriptions;

create policy "Auth read subscriptions"
  on push_subscriptions for select
  to authenticated
  using (true);

create policy "Auth delete subscriptions"
  on push_subscriptions for delete
  to authenticated
  using (true);

-- Sem INSERT/UPDATE directo para anon (só RPC abaixo)

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

  insert into push_subscriptions (endpoint, p256dh, auth, user_agent)
  values (
    p_endpoint,
    p_p256dh,
    p_auth,
    left(coalesce(p_user_agent, ''), 512)
  )
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent;
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, text, text) from public;
grant execute on function public.upsert_push_subscription(text, text, text, text) to anon, authenticated;

-- ---------- event_reminders ----------
drop policy if exists "Anyone insert reminders" on event_reminders;
drop policy if exists "Anyone update reminders" on event_reminders;
drop policy if exists "Anyone delete reminders" on event_reminders;
drop policy if exists "Anyone read reminders" on event_reminders;

create policy "Auth read reminders"
  on event_reminders for select
  to authenticated
  using (true);

-- Sem escrita directa anon; só RPC

create or replace function public.schedule_event_reminder(
  p_event_id uuid,
  p_endpoint text,
  p_scheduled_for timestamptz,
  p_title text,
  p_body text,
  p_url text default '/'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  if p_event_id is null then
    raise exception 'invalid event';
  end if;
  if not exists (select 1 from eventos e where e.id = p_event_id) then
    raise exception 'event not found';
  end if;
  if not exists (select 1 from push_subscriptions s where s.endpoint = p_endpoint) then
    raise exception 'unknown endpoint';
  end if;
  if p_scheduled_for is null or p_scheduled_for <= now() then
    raise exception 'scheduled_for must be in the future';
  end if;
  if p_scheduled_for > now() + interval '40 days' then
    raise exception 'scheduled_for too far';
  end if;
  if p_title is null or length(trim(p_title)) < 1 or length(p_title) > 120 then
    raise exception 'invalid title';
  end if;
  if p_body is null or length(trim(p_body)) < 1 or length(p_body) > 280 then
    raise exception 'invalid body';
  end if;

  v_url := coalesce(nullif(trim(p_url), ''), '/');
  if left(v_url, 1) <> '/' or left(v_url, 2) = '//' then
    raise exception 'invalid url';
  end if;
  if v_url ~* '^[a-z][a-z0-9+.-]*:' then
    raise exception 'invalid url scheme';
  end if;
  v_url := left(v_url, 500);

  insert into event_reminders (
    event_id, endpoint, scheduled_for, title, body, url, status, sent_at
  ) values (
    p_event_id, p_endpoint, p_scheduled_for,
    left(trim(p_title), 120), left(trim(p_body), 280), v_url,
    'pending', null
  )
  on conflict (event_id, endpoint) do update set
    scheduled_for = excluded.scheduled_for,
    title = excluded.title,
    body = excluded.body,
    url = excluded.url,
    status = 'pending',
    sent_at = null;
end;
$$;

create or replace function public.cancel_event_reminder(
  p_event_id uuid,
  p_endpoint text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or p_endpoint is null or length(p_endpoint) < 8 then
    raise exception 'missing endpoint';
  end if;

  update event_reminders
  set status = 'cancelled'
  where event_id = p_event_id
    and endpoint = p_endpoint
    and status = 'pending';
end;
$$;

revoke all on function public.schedule_event_reminder(uuid, text, timestamptz, text, text, text) from public;
revoke all on function public.cancel_event_reminder(uuid, text) from public;
grant execute on function public.schedule_event_reminder(uuid, text, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.cancel_event_reminder(uuid, text) to anon, authenticated;

-- ---------- feedback: limites ----------
alter table feedback drop constraint if exists feedback_mensagem_len;
alter table feedback
  add constraint feedback_mensagem_len
  check (char_length(mensagem) between 5 and 2000);

alter table feedback drop constraint if exists feedback_contacto_len;
alter table feedback
  add constraint feedback_contacto_len
  check (contacto is null or char_length(contacto) <= 200);

-- ---------- negocios: impedir auto-aprovação (se a tabela existir) ----------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'negocios'
  ) then
    execute 'drop policy if exists "Anyone insert negocios" on negocios';
    execute 'drop policy if exists "Public insert negocios" on negocios';
    execute $p$
      create policy "Public insert pending negocios"
        on negocios for insert
        to anon, authenticated
        with check (aprovado = false)
    $p$;
  end if;
exception when others then
  raise notice 'negocios policy skipped: %', SQLERRM;
end $$;
