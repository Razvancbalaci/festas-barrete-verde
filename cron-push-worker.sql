-- ============================================================
-- Cron: processar avisos agendados + lembretes a cada minuto
-- 1) Cria o secret CRON_SECRET na Edge Function send-push
-- 2) Substitui PROJECT_REF, ANON_KEY e CRON_SECRET abaixo
-- 3) Corre no SQL Editor
-- ============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Remove job antigo com o mesmo nome (se existir)
do $$
begin
  perform cron.unschedule('festas-push-worker');
exception when others then
  null;
end $$;

select cron.schedule(
  'festas-push-worker',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'ANON_KEY',
      'Authorization', 'Bearer ANON_KEY',
      'x-cron-secret', 'CRON_SECRET'
    ),
    body := jsonb_build_object('processSchedules', true),
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- Ver jobs:
-- select * from cron.job;
-- Histórico:
-- select * from cron.job_run_details order by start_time desc limit 20;
