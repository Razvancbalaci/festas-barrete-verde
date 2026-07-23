// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
      title: title.trim(),
      body: body.trim(),
      url: url || '/',
    }),
    {
      TTL: 60 * 60 * 12,
      urgency: 'high',
    }
  )
}

async function sendToAll(admin, title, body, url = '/') {
  vapidReady()

  const { data: subs, error: subError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

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

  return { sent, total: subs?.length || 0, removed: stale.length }
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
      const r = await sendToAll(admin, job.title, job.body, '/')
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

    // Público (anon): processar lembretes devidos — qualquer visita à app ajuda a disparar
    if (payload.processReminders) {
      const rem = await processEventReminders(admin)
      return new Response(JSON.stringify({ ok: true, reminders: rem }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = await requireUser(req, supabaseUrl, supabaseAnon)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin: avisos gerais agendados + lembretes
    if (payload.processSchedules) {
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

    const { title, body, url } = payload
    if (!title?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'title and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendToAll(admin, title, body, url)

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
