import fs from 'fs'

const anon = fs
  .readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('VITE_SUPABASE_ANON_KEY='))
  .slice('VITE_SUPABASE_ANON_KEY='.length)

const ref = 'lhfyrbqlsrqbrqggyajh'
const secret = process.env.CRON_SECRET
if (!secret) {
  console.error('Set CRON_SECRET env var')
  process.exit(1)
}

const sql = `create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

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
    url := 'https://${ref}.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '${anon}',
      'Authorization', 'Bearer ${anon}',
      'x-cron-secret', '${secret}'
    ),
    body := jsonb_build_object('processSchedules', true),
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
`

fs.writeFileSync('cron-push-worker.local.sql', sql)
console.log('Wrote cron-push-worker.local.sql')
