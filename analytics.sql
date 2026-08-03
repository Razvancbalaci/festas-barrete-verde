-- ============================================================
-- Telemetria anónima (visitas, favoritos, PWA, etc.)
-- Corre no SQL Editor do Supabase DEPOIS de security-hardening.sql
-- Pode voltar a correr (CREATE OR REPLACE) para actualizar RPCs.
-- ============================================================

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  payload jsonb not null default '{}',
  session_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on analytics_events (created_at desc);

create index if not exists analytics_events_name_created_idx
  on analytics_events (event_name, created_at desc);

alter table analytics_events enable row level security;

drop policy if exists "Auth read analytics" on analytics_events;
drop policy if exists "Admin read analytics" on analytics_events;
create policy "Admin read analytics"
  on analytics_events for select
  to authenticated
  using (
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin')))
      not in ('avisos', 'notify', 'governance')
  );

-- Sem INSERT directo; só via RPC

create or replace function public.record_analytics_event(
  p_event_name text,
  p_payload jsonb default '{}',
  p_session_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array[
    'page_view',
    'favorite_add',
    'favorite_remove',
    'pwa_install',
    'install_prompt_show',
    'install_prompt_dismiss',
    'install_prompt_accept',
    'push_prompt_show',
    'push_prompt_dismiss',
    'push_prompt_enable',
    'reminder_set',
    'reminder_cancel',
    'share',
    'ticket_click',
    'map_place_view',
    'map_walk',
    'lang_change',
    'filter_today',
    'filter_now',
    'filter_favorites',
    'filter_category',
    'search',
    'a11y_toggle',
    'comercio_submit'
  ];
  sid text;
  pl jsonb;
begin
  if p_event_name is null or not (p_event_name = any (allowed)) then
    raise exception 'invalid event_name';
  end if;

  sid := left(trim(coalesce(p_session_id, '')), 64);
  if length(sid) < 8 then
    raise exception 'invalid session_id';
  end if;

  pl := coalesce(p_payload, '{}'::jsonb);
  if length(pl::text) > 4096 then
    raise exception 'payload too large';
  end if;

  insert into analytics_events (event_name, payload, session_id)
  values (p_event_name, pl, sid);
end;
$$;

revoke all on function public.record_analytics_event(text, jsonb, text) from public;
grant execute on function public.record_analytics_event(text, jsonb, text) to anon, authenticated;

-- Resumo para o painel admin (só utilizadores autenticados)
-- p_day: se definido (data Lisboa), filtra só esse dia; senão usa os últimos p_days.
-- p_from/p_until: intervalo inclusivo (Lisboa) para relatório final da edição.
-- p_include_prelaunch: true = ler só o histórico antes do lançamento oficial (sem floor).
-- Lançamento oficial: 2026-08-03 16:00 Europe/Lisbon (soft cutoff; linhas antigas mantêm-se).
drop function if exists public.get_analytics_dashboard(int);
drop function if exists public.get_analytics_dashboard(int, date);
drop function if exists public.get_analytics_dashboard(int, date, date, date);
drop function if exists public.get_analytics_dashboard(int, date, date, date, boolean);

create or replace function public.get_analytics_dashboard(
  p_days int default 14,
  p_day date default null,
  p_from date default null,
  p_until date default null,
  p_include_prelaunch boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  until_ts timestamptz;
  hour_day date;
  hour_since timestamptz;
  hour_until timestamptz;
  launch_at timestamptz;
  summary_floor timestamptz;
  result jsonb;
  today_lisbon date;
  yesterday_lisbon date;
  push_total int := 0;
  push_active int := 0;
  has_active_col boolean := false;
  recent_sends jsonb := '[]'::jsonb;
  reminders_pending int := 0;
  jwt_role text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'unauthorized';
  end if;

  -- Só admin: contas avisos/notify/governance não leem o painel (nem via RPC directa).
  -- Sem role em app_metadata → trata-se como admin (igual ao resolveAdminRole do cliente).
  jwt_role := lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin')));
  if jwt_role in ('avisos', 'notify', 'governance') then
    raise exception 'forbidden';
  end if;

  -- Soft cutoff: telemetria de teste fica na tabela mas o painel oficial começa aqui.
  launch_at := ('2026-08-03 16:00:00'::timestamp without time zone at time zone 'Europe/Lisbon');

  p_days := greatest(1, least(coalesce(p_days, 14), 90));
  today_lisbon := (now() at time zone 'Europe/Lisbon')::date;
  yesterday_lisbon := today_lisbon - 1;

  if p_day is not null then
    since := (p_day::timestamp without time zone at time zone 'Europe/Lisbon');
    until_ts := since + interval '1 day';
  elsif p_from is not null then
    -- Intervalo inclusivo [p_from, p_until] em hora de Lisboa
    since := (p_from::timestamp without time zone at time zone 'Europe/Lisbon');
    until_ts := (
      (coalesce(p_until, p_from) + 1)::timestamp without time zone
      at time zone 'Europe/Lisbon'
    );
  else
    since := now() - (p_days || ' days')::interval;
    until_ts := 'infinity'::timestamptz;
  end if;

  if coalesce(p_include_prelaunch, false) then
    -- Arquivo pré-lançamento: nunca misturar com dados oficiais pós-16h
    until_ts := least(until_ts, launch_at);
    summary_floor := '-infinity'::timestamptz;
  else
    since := greatest(since, launch_at);
    summary_floor := launch_at;
  end if;

  -- Visitas por hora: sempre um dia concreto (o filtro, ou hoje no modo geral)
  hour_day := coalesce(p_day, case when p_from is not null and p_from = coalesce(p_until, p_from) then p_from else null end, today_lisbon);
  hour_since := (hour_day::timestamp without time zone at time zone 'Europe/Lisbon');
  hour_until := hour_since + interval '1 day';
  if coalesce(p_include_prelaunch, false) then
    hour_until := least(hour_until, launch_at);
  else
    hour_since := greatest(hour_since, launch_at);
  end if;

  select count(*)::int into push_total from push_subscriptions;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name = 'active'
  ) into has_active_col;

  if has_active_col then
    execute $q$
      select count(*)::int from push_subscriptions where coalesce(active, true) = true
    $q$ into push_active;
  else
    push_active := push_total;
  end if;

  if to_regclass('public.push_schedules') is not null then
    execute $q$
      select coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'title', title,
              'body', left(body, 140),
              'sent_at', sent_at,
              'status', status
            )
            order by sent_at desc
          )
          from (
            select title, body, sent_at, status
            from push_schedules
            where status = 'sent' and sent_at is not null
            order by sent_at desc
            limit 5
          ) ps
        ),
        '[]'::jsonb
      )
    $q$ into recent_sends;
  end if;

  if to_regclass('public.event_reminders') is not null then
    execute $q$
      select count(*)::int from event_reminders where sent_at is null
    $q$ into reminders_pending;
  end if;

  select jsonb_build_object(
    'days', p_days,
    'filter_day', p_day,
    'filter_from', p_from,
    'filter_until', p_until,
    'include_prelaunch', coalesce(p_include_prelaunch, false),
    'launch_at', launch_at,
    'visits_by_hour_day', hour_day,
    'since', since,
    'until', until_ts,
    'visits_by_day', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', day,
          'views', views,
          'sessions', sessions
        )
        order by day
      )
      from (
        select
          (created_at at time zone 'Europe/Lisbon')::date as day,
          count(*) filter (where event_name = 'page_view') as views,
          count(distinct session_id) filter (where event_name = 'page_view') as sessions
        from analytics_events
        where created_at >= since and created_at < until_ts
        group by 1
      ) d
    ), '[]'::jsonb),
    'visits_by_hour', coalesce((
      select jsonb_agg(
        jsonb_build_object('hour', h.hour, 'views', h.views)
        order by h.hour
      )
      from (
        select
          gs.hour,
          coalesce(v.views, 0)::int as views
        from generate_series(0, 23) as gs(hour)
        left join (
          select
            extract(hour from created_at at time zone 'Europe/Lisbon')::int as hour,
            count(*)::int as views
          from analytics_events
          where event_name = 'page_view'
            and created_at >= hour_since
            and created_at < hour_until
          group by 1
        ) v on v.hour = gs.hour
      ) h
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'page_views', (
        select count(*) from analytics_events
        where event_name = 'page_view' and created_at >= since and created_at < until_ts
      ),
      'unique_sessions', (
        select count(distinct session_id) from analytics_events
        where event_name = 'page_view' and created_at >= since and created_at < until_ts
      ),
      'pwa_sessions', (
        select count(distinct session_id) from analytics_events
        where event_name = 'page_view'
          and created_at >= since and created_at < until_ts
          and coalesce(payload->>'standalone', 'false') = 'true'
      ),
      'favorite_adds', (
        select count(*) from analytics_events
        where event_name = 'favorite_add' and created_at >= since and created_at < until_ts
      ),
      'favorite_users', (
        select count(distinct session_id) from analytics_events
        where event_name = 'favorite_add' and created_at >= since and created_at < until_ts
      ),
      'pwa_installs', (
        select count(*) from analytics_events
        where event_name = 'pwa_install' and created_at >= since and created_at < until_ts
      ),
      'install_prompt_shows', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_show' and created_at >= since and created_at < until_ts
      ),
      'install_prompt_accepts', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_accept' and created_at >= since and created_at < until_ts
      ),
      'install_prompt_dismisses', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_dismiss' and created_at >= since and created_at < until_ts
      ),
      'push_prompt_shows', (
        select count(*) from analytics_events
        where event_name = 'push_prompt_show' and created_at >= since and created_at < until_ts
      ),
      'push_enables', (
        select count(*) from analytics_events
        where event_name = 'push_prompt_enable' and created_at >= since and created_at < until_ts
      ),
      'reminders_set', (
        select count(*) from analytics_events
        where event_name = 'reminder_set' and created_at >= since and created_at < until_ts
      ),
      'shares', (
        select count(*) from analytics_events
        where event_name = 'share' and created_at >= since and created_at < until_ts
      ),
      'ticket_clicks', (
        select count(*) from analytics_events
        where event_name = 'ticket_click' and created_at >= since and created_at < until_ts
      ),
      'filter_today', (
        select count(*) from analytics_events
        where event_name = 'filter_today' and created_at >= since and created_at < until_ts
      ),
      'filter_now', (
        select count(*) from analytics_events
        where event_name = 'filter_now' and created_at >= since and created_at < until_ts
      ),
      'filter_favorites', (
        select count(*) from analytics_events
        where event_name = 'filter_favorites' and created_at >= since and created_at < until_ts
      ),
      'searches', (
        select count(*) from analytics_events
        where event_name = 'search' and created_at >= since and created_at < until_ts
      ),
      'a11y_toggles', (
        select count(*) from analytics_events
        where event_name = 'a11y_toggle' and created_at >= since and created_at < until_ts
      ),
      'a11y_on', (
        select count(*) from analytics_events
        where event_name = 'a11y_toggle'
          and created_at >= since and created_at < until_ts
          and coalesce(payload->>'on', 'false') = 'true'
      ),
      'map_walks', (
        select count(*) from analytics_events
        where event_name = 'map_walk' and created_at >= since and created_at < until_ts
      ),
      'comercio_submits', (
        select count(*) from analytics_events
        where event_name = 'comercio_submit' and created_at >= since and created_at < until_ts
      )
    ),
    'routes', coalesce((
      select jsonb_agg(jsonb_build_object('route', route, 'views', views) order by views desc)
      from (
        select coalesce(payload->>'route', '/') as route, count(*) as views
        from analytics_events
        where event_name = 'page_view' and created_at >= since and created_at < until_ts
        group by 1
      ) r
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object('lang', lang, 'count', count) order by count desc)
      from (
        select coalesce(payload->>'lang', '?') as lang, count(*) as count
        from analytics_events
        where event_name = 'lang_change' and created_at >= since and created_at < until_ts
        group by 1
      ) l
    ), '[]'::jsonb),
    -- Sessões únicas por idioma (a partir de page_view.payload.lang)
    'visits_by_lang', coalesce((
      select jsonb_agg(
        jsonb_build_object('lang', lang, 'sessions', sessions)
        order by sessions desc
      )
      from (
        select
          lower(coalesce(nullif(trim(payload->>'lang'), ''), '?')) as lang,
          count(distinct session_id)::int as sessions
        from analytics_events
        where event_name = 'page_view'
          and created_at >= since and created_at < until_ts
        group by 1
      ) vl
    ), '[]'::jsonb),
    -- Retenção intra-período: sessões em >1 dia vs 1 dia só
    'retention', coalesce((
      with session_days as (
        select
          session_id,
          count(distinct (created_at at time zone 'Europe/Lisbon')::date) as day_count
        from analytics_events
        where event_name = 'page_view'
          and created_at >= since and created_at < until_ts
        group by session_id
      )
      select jsonb_build_object(
        'returning_sessions', (
          select count(*)::int from session_days where day_count > 1
        ),
        'one_day_sessions', (
          select count(*)::int from session_days where day_count = 1
        ),
        'total_sessions', (
          select count(*)::int from session_days
        )
      )
    ), jsonb_build_object(
      'returning_sessions', 0,
      'one_day_sessions', 0,
      'total_sessions', 0
    )),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'count', count) order by count desc)
      from (
        select coalesce(payload->>'category', 'all') as category, count(*) as count
        from analytics_events
        where event_name = 'filter_category' and created_at >= since and created_at < until_ts
        group by 1
      ) c
    ), '[]'::jsonb),
    'top_favorites', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', event_id, 'adds', adds) order by adds desc)
      from (
        select payload->>'event_id' as event_id, count(*) as adds
        from analytics_events
        where event_name = 'favorite_add'
          and created_at >= since and created_at < until_ts
          and payload ? 'event_id'
        group by 1
        order by adds desc
        limit 10
      ) f
    ), '[]'::jsonb),
    'top_shares', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', event_id, 'count', count) order by count desc)
      from (
        select payload->>'event_id' as event_id, count(*) as count
        from analytics_events
        where event_name = 'share'
          and created_at >= since and created_at < until_ts
          and payload ? 'event_id'
        group by 1
        order by count desc
        limit 8
      ) s
    ), '[]'::jsonb),
    'top_reminders', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', event_id, 'count', count) order by count desc)
      from (
        select payload->>'event_id' as event_id, count(*) as count
        from analytics_events
        where event_name = 'reminder_set'
          and created_at >= since and created_at < until_ts
          and payload ? 'event_id'
        group by 1
        order by count desc
        limit 8
      ) rem
    ), '[]'::jsonb),
    'top_tickets', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', event_id, 'count', count) order by count desc)
      from (
        select payload->>'event_id' as event_id, count(*) as count
        from analytics_events
        where event_name = 'ticket_click'
          and created_at >= since and created_at < until_ts
          and payload ? 'event_id'
        group by 1
        order by count desc
        limit 8
      ) t
    ), '[]'::jsonb),
    'top_map_places', coalesce((
      select jsonb_agg(jsonb_build_object('place_id', place_id, 'views', views) order by views desc)
      from (
        select payload->>'place_id' as place_id, count(*) as views
        from analytics_events
        where event_name = 'map_place_view'
          and created_at >= since and created_at < until_ts
          and payload ? 'place_id'
        group by 1
        order by views desc
        limit 10
      ) m
    ), '[]'::jsonb),
    'top_map_walks', coalesce((
      select jsonb_agg(jsonb_build_object('place_id', place_id, 'count', count) order by count desc)
      from (
        select payload->>'place_id' as place_id, count(*) as count
        from analytics_events
        where event_name = 'map_walk'
          and created_at >= since and created_at < until_ts
          and payload ? 'place_id'
        group by 1
        order by count desc
        limit 10
      ) w
    ), '[]'::jsonb),
    'push_subscribers', push_total,
    'push_subscribers_active', push_active,
    'recent_push_sends', coalesce(recent_sends, '[]'::jsonb),
    'summary', jsonb_build_object(
      'today', jsonb_build_object(
        'day', today_lisbon,
        'sessions', (
          select count(distinct session_id) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
        ),
        'page_views', (
          select count(*) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
        ),
        'pwa_sessions', (
          select count(distinct session_id) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
            and coalesce(payload->>'standalone', 'false') = 'true'
        ),
        'reminders_set', (
          select count(*) from analytics_events
          where event_name = 'reminder_set'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
        ),
        'shares', (
          select count(*) from analytics_events
          where event_name = 'share'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
        ),
        'push_enables', (
          select count(*) from analytics_events
          where event_name = 'push_prompt_enable'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = today_lisbon
        )
      ),
      'yesterday', jsonb_build_object(
        'day', yesterday_lisbon,
        'sessions', (
          select count(distinct session_id) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
        ),
        'page_views', (
          select count(*) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
        ),
        'pwa_sessions', (
          select count(distinct session_id) from analytics_events
          where event_name = 'page_view'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
            and coalesce(payload->>'standalone', 'false') = 'true'
        ),
        'reminders_set', (
          select count(*) from analytics_events
          where event_name = 'reminder_set'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
        ),
        'shares', (
          select count(*) from analytics_events
          where event_name = 'share'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
        ),
        'push_enables', (
          select count(*) from analytics_events
          where event_name = 'push_prompt_enable'
            and created_at >= summary_floor
            and (created_at at time zone 'Europe/Lisbon')::date = yesterday_lisbon
        )
      )
    ),
    'reminders_active', reminders_pending,
    'feedback_total', (select count(*) from feedback),
    'feedback_unread', (select count(*) from feedback where not lido),
    'feedback_by_type', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'count', count) order by count desc)
      from (
        select coalesce(tipo, '?') as tipo, count(*) as count
        from feedback
        group by 1
      ) fb
    ), '[]'::jsonb),
    'negocios_pending', (select count(*) from negocios where not aprovado),
    'negocios_approved', (select count(*) from negocios where aprovado)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_analytics_dashboard(int, date, date, date, boolean) from public;
grant execute on function public.get_analytics_dashboard(int, date, date, date, boolean) to authenticated;
