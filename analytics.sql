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
create policy "Auth read analytics"
  on analytics_events for select
  to authenticated
  using (true);

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
create or replace function public.get_analytics_dashboard(p_days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  result jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'unauthorized';
  end if;

  p_days := greatest(1, least(coalesce(p_days, 14), 90));
  since := now() - (p_days || ' days')::interval;

  select jsonb_build_object(
    'days', p_days,
    'since', since,
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
        where created_at >= since
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
          where event_name = 'page_view' and created_at >= since
          group by 1
        ) v on v.hour = gs.hour
      ) h
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'page_views', (
        select count(*) from analytics_events
        where event_name = 'page_view' and created_at >= since
      ),
      'unique_sessions', (
        select count(distinct session_id) from analytics_events
        where event_name = 'page_view' and created_at >= since
      ),
      'pwa_sessions', (
        select count(distinct session_id) from analytics_events
        where event_name = 'page_view'
          and created_at >= since
          and coalesce(payload->>'standalone', 'false') = 'true'
      ),
      'favorite_adds', (
        select count(*) from analytics_events
        where event_name = 'favorite_add' and created_at >= since
      ),
      'favorite_users', (
        select count(distinct session_id) from analytics_events
        where event_name = 'favorite_add' and created_at >= since
      ),
      'pwa_installs', (
        select count(*) from analytics_events
        where event_name = 'pwa_install' and created_at >= since
      ),
      'install_prompt_shows', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_show' and created_at >= since
      ),
      'install_prompt_accepts', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_accept' and created_at >= since
      ),
      'install_prompt_dismisses', (
        select count(*) from analytics_events
        where event_name = 'install_prompt_dismiss' and created_at >= since
      ),
      'push_prompt_shows', (
        select count(*) from analytics_events
        where event_name = 'push_prompt_show' and created_at >= since
      ),
      'push_enables', (
        select count(*) from analytics_events
        where event_name = 'push_prompt_enable' and created_at >= since
      ),
      'reminders_set', (
        select count(*) from analytics_events
        where event_name = 'reminder_set' and created_at >= since
      ),
      'shares', (
        select count(*) from analytics_events
        where event_name = 'share' and created_at >= since
      ),
      'ticket_clicks', (
        select count(*) from analytics_events
        where event_name = 'ticket_click' and created_at >= since
      ),
      'filter_today', (
        select count(*) from analytics_events
        where event_name = 'filter_today' and created_at >= since
      ),
      'filter_now', (
        select count(*) from analytics_events
        where event_name = 'filter_now' and created_at >= since
      ),
      'filter_favorites', (
        select count(*) from analytics_events
        where event_name = 'filter_favorites' and created_at >= since
      ),
      'searches', (
        select count(*) from analytics_events
        where event_name = 'search' and created_at >= since
      ),
      'a11y_toggles', (
        select count(*) from analytics_events
        where event_name = 'a11y_toggle' and created_at >= since
      ),
      'a11y_on', (
        select count(*) from analytics_events
        where event_name = 'a11y_toggle'
          and created_at >= since
          and coalesce(payload->>'on', 'false') = 'true'
      ),
      'map_walks', (
        select count(*) from analytics_events
        where event_name = 'map_walk' and created_at >= since
      ),
      'comercio_submits', (
        select count(*) from analytics_events
        where event_name = 'comercio_submit' and created_at >= since
      )
    ),
    'routes', coalesce((
      select jsonb_agg(jsonb_build_object('route', route, 'views', views) order by views desc)
      from (
        select coalesce(payload->>'route', '/') as route, count(*) as views
        from analytics_events
        where event_name = 'page_view' and created_at >= since
        group by 1
      ) r
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object('lang', lang, 'count', count) order by count desc)
      from (
        select coalesce(payload->>'lang', '?') as lang, count(*) as count
        from analytics_events
        where event_name = 'lang_change' and created_at >= since
        group by 1
      ) l
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'count', count) order by count desc)
      from (
        select coalesce(payload->>'category', 'all') as category, count(*) as count
        from analytics_events
        where event_name = 'filter_category' and created_at >= since
        group by 1
      ) c
    ), '[]'::jsonb),
    'top_favorites', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', event_id, 'adds', adds) order by adds desc)
      from (
        select payload->>'event_id' as event_id, count(*) as adds
        from analytics_events
        where event_name = 'favorite_add'
          and created_at >= since
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
          and created_at >= since
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
          and created_at >= since
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
          and created_at >= since
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
          and created_at >= since
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
          and created_at >= since
          and payload ? 'place_id'
        group by 1
        order by count desc
        limit 10
      ) w
    ), '[]'::jsonb),
    'push_subscribers', (select count(*) from push_subscriptions),
    'reminders_active', (
      select count(*) from event_reminders where sent_at is null
    ),
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

revoke all on function public.get_analytics_dashboard(int) from public;
grant execute on function public.get_analytics_dashboard(int) to authenticated;
