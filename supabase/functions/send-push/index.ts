// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
// Opcional: ADMIN_EMAILS=email1@...,email2@... (obrigatório para broadcast)
// Opcional: CRON_SECRET — se definido, processReminders exige header x-cron-secret
//           OU um utilizador autenticado (admin).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function sanitizeAppPath(url) {
  const raw = String(url || '/').trim() || '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return '/'
  if (!/^\/[\w\-./?&=%+#@,~]*$/i.test(raw)) return '/'
  return raw.slice(0, 500)
}

function vapidReady() {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
  if (!vapidPublic || !vapidPrivate) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

async function pushOne(sub, title, body, url = '/') {
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify({
      title: String(title || '').trim().slice(0, 120),
      body: String(body || '').trim().slice(0, 280),
      url: sanitizeAppPath(url),
    }),
    {
      TTL: 60 * 60 * 12,
      urgency: 'high',
    }
  )
}

async function sendToAll(admin, title, body, url = '/', category = 'broadcast') {
  vapidReady()

  const cat = ['street', 'corrida', 'sjoao', 'broadcast'].includes(category)
    ? category
    : 'broadcast'
  const prefCol =
    cat === 'street'
      ? 'pref_street'
      : cat === 'corrida'
        ? 'pref_corrida'
        : cat === 'sjoao'
          ? 'pref_sjoao'
          : 'pref_broadcast'

  let query = admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq(prefCol, true)

  const { data: subs, error: subError } = await query

  if (subError) throw subError

  let sent = 0
  const stale = []

  await Promise.all(
    (subs || []).map(async (sub) => {
      try {
        await pushOne(sub, title, body, url)
        sent += 1
      } catch (err) {
        const code = err?.statusCode
        if (code === 404 || code === 410) stale.push(sub.id)
        else console.error('push fail', code, sub.endpoint?.slice(0, 48), err?.body || err?.message)
      }
    })
  )

  if (stale.length) {
    await admin.from('push_subscriptions').delete().in('id', stale)
  }

  return { sent, total: subs?.length || 0, removed: stale.length, category: cat }
}

function categoryFromSchedule(job) {
  if (job?.category && ['street', 'corrida', 'sjoao', 'broadcast'].includes(job.category)) {
    return job.category
  }
  const m = String(job?.dedupe_key || '').match(/^auto:([a-z]+):/)
  if (m && ['street', 'corrida', 'sjoao'].includes(m[1])) return m[1]
  return 'broadcast'
}

/** Lembretes por evento → um push por subscrição (app pode estar fechada). */
async function processEventReminders(admin) {
  vapidReady()

  const { data: due, error } = await admin
    .from('event_reminders')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(80)

  if (error) throw error

  let sent = 0
  let cancelled = 0
  const staleEndpoints = []

  for (const job of due || []) {
    const { data: sub } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('endpoint', job.endpoint)
      .maybeSingle()

    if (!sub) {
      await admin
        .from('event_reminders')
        .update({ status: 'cancelled' })
        .eq('id', job.id)
      cancelled += 1
      continue
    }

    try {
      await pushOne(sub, job.title, job.body, job.url || '/')
      await admin
        .from('event_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', job.id)
      sent += 1
    } catch (err) {
      const code = err?.statusCode
      if (code === 404 || code === 410) {
        staleEndpoints.push(sub.id)
        await admin
          .from('event_reminders')
          .update({ status: 'cancelled' })
          .eq('id', job.id)
        cancelled += 1
      } else {
        console.error('reminder push fail', code, err?.body || err?.message)
      }
    }
  }

  if (staleEndpoints.length) {
    await admin.from('push_subscriptions').delete().in('id', staleEndpoints)
  }

  return { sent, cancelled, total: due?.length || 0 }
}

async function processBroadcastSchedules(admin) {
  const { data: due, error: dueError } = await admin
    .from('push_schedules')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (dueError) throw dueError

  const results = []
  for (const job of due || []) {
    try {
      const r = await sendToAll(
        admin,
        job.title,
        job.body,
        '/',
        categoryFromSchedule(job)
      )
      await admin
        .from('push_schedules')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', job.id)
      results.push({ id: job.id, ...r })
    } catch (err) {
      results.push({ id: job.id, error: String(err?.message || err) })
    }
  }
  return results
}

async function requireUser(req, supabaseUrl, supabaseAnon) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) return null
  return user
}

function isAllowedAdmin(user) {
  const raw = Deno.env.get('ADMIN_EMAILS') || ''
  const allow = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!allow.length) return false
  const email = String(user?.email || '').toLowerCase()
  return Boolean(email && allow.includes(email))
}

function cronAuthorized(req) {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret) return false
  return req.headers.get('x-cron-secret') === secret
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const admin = createClient(supabaseUrl, serviceKey)

    const payload = await req.json().catch(() => ({}))
    const cronOk = cronAuthorized(req)
    const cronConfigured = Boolean(Deno.env.get('CRON_SECRET'))
    const user = await requireUser(req, supabaseUrl, supabaseAnon)
    const adminOk = isAllowedAdmin(user)

    // Worker: avisos agendados + lembretes (cron com secret, ou admin)
    if (payload.processSchedules) {
      if (!cronOk && !adminOk) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const results = await processBroadcastSchedules(admin)
      const rem = await processEventReminders(admin)
      return new Response(
        JSON.stringify({
          ok: true,
          processed: results.length,
          results,
          reminders: rem,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Só lembretes: cron/admin, ou anon se CRON_SECRET ainda não estiver definido
    if (payload.processReminders) {
      if (cronConfigured) {
        if (!cronOk && !adminOk) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const rem = await processEventReminders(admin)
      return new Response(JSON.stringify({ ok: true, reminders: rem }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!adminOk) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { title, body, url, category } = payload
    if (!title?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'title and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendToAll(
      admin,
      String(title).slice(0, 120),
      String(body).slice(0, 500),
      sanitizeAppPath(url),
      categoryFromSchedule({ category, dedupe_key: null })
    )

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
