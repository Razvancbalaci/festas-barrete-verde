/**
 * Probe de segurança como visitante anónimo (só VITE_SUPABASE_ANON_KEY).
 *
 * Uso:
 *   node scripts/anon-security-probe.mjs
 *   node scripts/anon-security-probe.mjs --skip-spam
 *
 * Não usa service_role. Os testes de spam escrevem linhas reais se o insert
 * anónimo for permitido — marcadas com [SECURITY-TEST-DELETE-ME].
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const skipSpam = process.argv.includes('--skip-spam')
const MARKER = '[SECURITY-TEST-DELETE-ME]'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function decodeJwtPayload(jwt) {
  const parts = String(jwt || '').split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    return JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function errMsg(error) {
  if (!error) return null
  return error.message || error.code || String(error)
}

function printResult(name, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`)
  if (detail) console.log(`       ${detail}`)
}

const env = {
  ...loadEnvFile(path.join(root, '.env')),
  ...loadEnvFile(path.join(root, '.env.local')),
  ...process.env,
}

const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env')
  process.exit(1)
}

if (env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY) {
  console.warn(
    'Aviso: há variáveis service_role no ambiente, mas este script NÃO as usa.',
  )
}

function assertClientKey(key) {
  const k = String(key || '')
  if (k.startsWith('sb_secret_') || /service_role/i.test(k)) {
    return {
      ok: false,
      detail: 'parece service_role / sb_secret — recusado',
    }
  }
  if (k.startsWith('sb_publishable_')) {
    return { ok: true, detail: 'formato sb_publishable_ (anon/publishable)' }
  }
  const jwtPayload = decodeJwtPayload(k)
  if (jwtPayload?.role === 'service_role') {
    return { ok: false, detail: 'JWT role=service_role — recusado' }
  }
  if (jwtPayload?.role === 'anon') {
    return { ok: true, detail: 'JWT role=anon' }
  }
  if (jwtPayload?.role) {
    return {
      ok: false,
      detail: `JWT role="${jwtPayload.role}" (esperado anon)`,
    }
  }
  return {
    ok: false,
    detail:
      'formato desconhecido (esperado JWT anon ou sb_publishable_*)',
  }
}

const keyCheck = assertClientKey(anonKey)
if (!keyCheck.ok) {
  console.error(`Recusado: VITE_SUPABASE_ANON_KEY ${keyCheck.detail}`)
  process.exit(1)
}

console.log('=== Anon security probe ===')
console.log(`URL:  ${url}`)
console.log(`Key:  ${keyCheck.detail}`)
console.log(`Spam: ${skipSpam ? 'ignorado (--skip-spam)' : 'activo'}`)
console.log('')

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

let passed = 0
let failed = 0

function pass(name, detail) {
  passed += 1
  printResult(name, true, detail)
}

function fail(name, detail) {
  failed += 1
  printResult(name, false, detail)
}

/** PASS se RLS/erro bloqueou, ou (quando emptyOk) se veio vazio sem dados. */
function expectDenied(name, { error, data, emptyOk = false }) {
  const hasRows = Array.isArray(data) ? data.length > 0 : data != null
  if (error) {
    pass(name, `bloqueado: ${errMsg(error)}`)
    return
  }
  if (emptyOk && !hasRows) {
    pass(name, 'sem erro mas resultado vazio (ok)')
    return
  }
  if (!hasRows && !emptyOk) {
    // Select sem erro e 0 rows: tipicamente RLS escondeu tudo — tratar como PASS
    pass(name, '0 linhas (RLS filtrou / tabela vazia para anon)')
    return
  }
  fail(name, `permitiu ler/escrever dados: ${JSON.stringify(data).slice(0, 160)}`)
}

/** PASS se UPDATE/DELETE não afectou linhas (PostgREST + RLS). */
function expectNoMutation(name, { error, data }) {
  if (error) {
    pass(name, `bloqueado: ${errMsg(error)}`)
    return
  }
  if (!data || data.length === 0) {
    pass(name, '0 linhas afectadas (RLS filtrado)')
    return
  }
  fail(name, `mutação afectou ${data.length} linha(s)`)
}

function expectRpcRejected(name, error) {
  if (error) pass(name, `rejeitado: ${errMsg(error)}`)
  else fail(name, 'RPC aceitou o pedido (não deveria)')
}

// ---------------------------------------------------------------------------
// 1) Insert evento falso
// ---------------------------------------------------------------------------
{
  const { data, error } = await supabase
    .from('eventos')
    .insert({
      dia: '2099-01-01',
      hora: '12:00',
      titulo: `${MARKER} evento falso anon`,
      local: 'probe',
      categoria: 'outros',
      ordem: 0,
    })
    .select('id')
  expectDenied('Insert evento (anon)', { error, data })
}

// ---------------------------------------------------------------------------
// 2) Update / delete evento existente
// ---------------------------------------------------------------------------
{
  const { data: existing, error: readErr } = await supabase
    .from('eventos')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (readErr || !existing?.id) {
    fail(
      'Update/delete evento (pré-requisito)',
      `não li um evento existente: ${errMsg(readErr) || 'vazio'}`,
    )
  } else {
    const { data: updData, error: updErr } = await supabase
      .from('eventos')
      .update({ titulo: `${MARKER} hacked` })
      .eq('id', existing.id)
      .select('id')
    expectNoMutation('Update evento existente (anon)', {
      error: updErr,
      data: updData,
    })

    const { data: delData, error: delErr } = await supabase
      .from('eventos')
      .delete()
      .eq('id', existing.id)
      .select('id')
    expectNoMutation('Delete evento existente (anon)', {
      error: delErr,
      data: delData,
    })
  }
}

// ---------------------------------------------------------------------------
// 3) Ler push_subscriptions
// ---------------------------------------------------------------------------
{
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint')
    .limit(5)
  expectDenied('Select push_subscriptions (anon)', {
    error,
    data,
    emptyOk: true,
  })
}

// ---------------------------------------------------------------------------
// 4) Ler feedback
// ---------------------------------------------------------------------------
{
  const { data, error } = await supabase
    .from('feedback')
    .select('id, mensagem')
    .limit(5)
  expectDenied('Select feedback (anon)', { error, data, emptyOk: true })
}

// ---------------------------------------------------------------------------
// 5) Aprovar negócio (update aprovado=true) + insert já aprovado
// ---------------------------------------------------------------------------
{
  const { data: biz, error: bizReadErr } = await supabase
    .from('negocios')
    .select('id, aprovado')
    .eq('aprovado', true)
    .limit(1)
    .maybeSingle()

  if (bizReadErr) {
    fail(
      'Update negocio.aprovado (pré-requisito)',
      `select falhou: ${errMsg(bizReadErr)}`,
    )
  } else if (!biz?.id) {
    // Sem negócio aprovado público: tentar update cego com UUID aleatório
    const { data, error } = await supabase
      .from('negocios')
      .update({ aprovado: true })
      .eq('id', randomUUID())
      .select('id')
    expectNoMutation(
      'Update negocio.aprovado=true (anon, id inexistente)',
      { error, data },
    )
  } else {
    const { data, error } = await supabase
      .from('negocios')
      .update({ aprovado: true })
      .eq('id', biz.id)
      .select('id, aprovado')
    expectNoMutation('Update negocio.aprovado=true (anon)', { error, data })
  }

  const { data: insData, error: insErr } = await supabase
    .from('negocios')
    .insert({
      nome: `${MARKER} auto-aprovado`,
      tipo: 'Outro',
      descricao: `${MARKER} tentativa de insert com aprovado=true`,
      morada: 'probe',
      telefone: '000000000',
      email: 'probe@example.invalid',
      aprovado: true,
    })
    .select('id')
  expectDenied('Insert negocio com aprovado=true (anon)', {
    error: insErr,
    data: insData,
  })
}

// ---------------------------------------------------------------------------
// 6) RPC schedule_event_reminder — inputs inválidos
// ---------------------------------------------------------------------------
{
  const fakeEndpoint = `https://security-test.invalid/anon-probe/${Date.now()}`
  const pastIso = new Date(Date.now() - 60_000).toISOString()
  const futureIso = new Date(Date.now() + 3_600_000).toISOString()

  // 6a) event_id inválido
  {
    const { error } = await supabase.rpc('schedule_event_reminder', {
      p_event_id: randomUUID(),
      p_endpoint: fakeEndpoint,
      p_scheduled_for: futureIso,
      p_title: 'probe',
      p_body: 'probe body',
      p_url: '/',
    })
    expectRpcRejected('RPC schedule_event_reminder — event_id inválido', error)
  }

  // Para chegar a scheduled_for / url: preciso de evento real + endpoint conhecido.
  // Crio endpoint temporário via RPC pública upsert_push_subscription (se existir).
  const { data: realEvent } = await supabase
    .from('eventos')
    .select('id')
    .limit(1)
    .maybeSingle()

  let endpointReady = false
  if (realEvent?.id) {
    const { error: upErr } = await supabase.rpc('upsert_push_subscription', {
      p_endpoint: fakeEndpoint,
      p_p256dh: 'dGVzdC1wMjU2ZGgtcHJvYmUtYW5vbg', // base64-ish dummy (>8 chars)
      p_auth: 'dGVzdC1hdXRo',
      p_user_agent: 'anon-security-probe',
    })
    if (upErr) {
      console.log(
        `       (aviso) não criei endpoint de teste via upsert: ${errMsg(upErr)}`,
      )
      console.log(
        '       Os testes de past/url podem falhar mais cedo (unknown endpoint) — ainda assim devem ser rejeitados.',
      )
    } else {
      endpointReady = true
      console.log(
        `       (nota) endpoint de teste criado: ${fakeEndpoint}`,
      )
      console.log(
        '       Limpeza manual sugerida: delete from push_subscriptions where endpoint like \'https://security-test.invalid/%\';',
      )
    }

    // 6b) scheduled_for no passado
    {
      const { error } = await supabase.rpc('schedule_event_reminder', {
        p_event_id: realEvent.id,
        p_endpoint: fakeEndpoint,
        p_scheduled_for: pastIso,
        p_title: 'probe',
        p_body: 'probe body',
        p_url: '/',
      })
      expectRpcRejected(
        'RPC schedule_event_reminder — scheduled_for no passado',
        error,
      )
    }

    // 6c) p_url javascript:
    {
      const { error } = await supabase.rpc('schedule_event_reminder', {
        p_event_id: realEvent.id,
        p_endpoint: fakeEndpoint,
        p_scheduled_for: futureIso,
        p_title: 'probe',
        p_body: 'probe body',
        p_url: 'javascript:alert(1)',
      })
      expectRpcRejected(
        'RPC schedule_event_reminder — p_url javascript:',
        error,
      )
    }

    // 6d) p_url //evil.com
    {
      const { error } = await supabase.rpc('schedule_event_reminder', {
        p_event_id: realEvent.id,
        p_endpoint: fakeEndpoint,
        p_scheduled_for: futureIso,
        p_title: 'probe',
        p_body: 'probe body',
        p_url: '//evil.com/phish',
      })
      expectRpcRejected('RPC schedule_event_reminder — p_url //evil.com', error)
    }

    if (endpointReady) {
      await supabase.rpc('cancel_event_reminder', {
        p_event_id: realEvent.id,
        p_endpoint: fakeEndpoint,
      })
    }
  } else {
    fail(
      'RPC schedule_event_reminder — past/url (pré-requisito)',
      'sem eventos públicos para testar scheduled_for / url',
    )
  }
}

// ---------------------------------------------------------------------------
// 7) Spam rápido em feedback + negocios
// ---------------------------------------------------------------------------
if (!skipSpam) {
  const BURST = 15

  async function burst(label, runOne) {
    const t0 = Date.now()
    const results = await Promise.all(
      Array.from({ length: BURST }, (_, i) => runOne(i)),
    )
    const ms = Date.now() - t0
    const okCount = results.filter((r) => !r.error).length
    const errSample = results.find((r) => r.error)?.error

    // Para spam: PASS = houve bloqueio / rate limit (maioria falhou)
    // FAIL = permitiu a maioria (sem protecção visível)
    if (okCount === 0) {
      pass(
        `${label} burst ×${BURST}`,
        `todos bloqueados em ${ms}ms — ${errMsg(errSample) || 'erro'}`,
      )
    } else if (okCount < BURST / 2) {
      pass(
        `${label} burst ×${BURST}`,
        `parcial: ${okCount}/${BURST} ok em ${ms}ms (alguma fricção)`,
      )
    } else {
      fail(
        `${label} burst ×${BURST}`,
        `sem protecção visível: ${okCount}/${BURST} inserts ok em ${ms}ms`,
      )
    }
  }

  await burst('Spam feedback (anon insert)', async (i) => {
    const { error } = await supabase.from('feedback').insert({
      tipo: 'sugestao',
      mensagem: `${MARKER} feedback spam probe #${i} ${Date.now()}`,
      contacto: null,
    })
    return { error }
  })

  await burst('Spam negocios (anon insert)', async (i) => {
    const { error } = await supabase.from('negocios').insert({
      nome: `${MARKER} spam #${i}`,
      tipo: 'Outro',
      descricao: `${MARKER} negocio spam probe #${i}`,
      morada: 'probe',
      telefone: '000000000',
      email: `probe+${i}@example.invalid`,
      aprovado: false,
    })
    return { error }
  })

  console.log('')
  console.log('Limpeza SQL sugerida após spam:')
  console.log(
    `  delete from feedback where mensagem like '${MARKER}%';`,
  )
  console.log(
    `  delete from negocios where nome like '${MARKER}%' or descricao like '${MARKER}%';`,
  )
}

console.log('')
console.log(`Resumo: ${passed} PASS, ${failed} FAIL`)
process.exit(failed > 0 ? 1 : 0)
