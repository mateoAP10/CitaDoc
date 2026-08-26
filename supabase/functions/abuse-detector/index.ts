import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// Observabilidad -- deteccion de abuso, corre via pg_cron cada 15 min.
// Evalua 3 fuentes ya existentes (ai_rate_limits, ai_usage_logs,
// admin_action_logs), sin infraestructura nueva salvo esta funcion.
//
// Arquitectura: cada senal es independiente (try/catch propio -- un
// fallo nunca tumba a las demas). Si dispara, se chequea cooldown en
// ai_rate_limits con feature='alert:<tipo>' (convencion explicita,
// NUNCA se lee como metrica de consumo real, solo abuse-detector la
// toca). Si no esta en cooldown (no se mando esta alerta en la ultima
// hora), se manda un email real via send-email con service_role
// (type:'security_alert', unico alcanzable solo con esa credencial).
// Heartbeat propio en admin_action_logs al final de cada corrida,
// independiente del auto-log de requireAdmin (que a proposito no
// loguea exitos de service_role).

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL}/functions/v1/send-email`
const ALERT_TO_EMAIL   = 'mateoalarconpons@gmail.com'

// IMPORTANT: keep synchronized with LIMITS in _shared/rate-limit.ts --
// esta es una copia deliberada, no dinamica (P0.1/P1.2 necesitan saber
// el limite por hora de cada feature para detectar "se llego al limite
// N veces seguidas"). Si se cambia un limite alla, hay que actualizarlo
// aca tambien.
const KNOWN_HOURLY_LIMITS: Record<string, number> = {
  send_email_user:            100,
  send_email_public:          30,
  website_config:             10,
  growth_daily_batch:         2,
  showcase_batch:             2,
  scout_leads:                3,
  generate_showcase_content:  15,
  generate_citadoc_content:   30,
  meta_campaigns:             30,
  meta_publish:               5,
  payphone_prepare:           20,
  triage_especialidad:        10,
  tag_asset:                  15,
  voice_extraction:           60,
  voice_assistant_intent:     80,
  voice_assistant_chat:       400,
  summary_generation:         20,
  growth_content:             15,
}

type SignalOutcome = { fired: boolean; detail?: string }

// ── P0.1 -- rate limit alcanzado repetidamente ──────────────────────────────
async function sigRateLimitRepeated(sb: SupabaseClient): Promise<SignalOutcome> {
  const { data, error } = await sb
    .from('ai_rate_limits')
    .select('doctor_id, ip, feature, window_start, request_count')
    .not('feature', 'like', 'alert:%')
    .gte('window_start', new Date(Date.now() - 3 * 3600_000).toISOString())
  if (error) throw error
  if (!data?.length) return { fired: false }

  const perHour = new Map<string, Map<string, number>>()
  for (const row of data as any[]) {
    const entity = row.doctor_id || row.ip || 'unknown'
    const ef = `${entity}::${row.feature}`
    const h = new Date(row.window_start); h.setUTCMinutes(0, 0, 0)
    const hKey = h.toISOString()
    if (!perHour.has(ef)) perHour.set(ef, new Map())
    const m = perHour.get(ef)!
    m.set(hKey, (m.get(hKey) || 0) + row.request_count)
  }

  const offenders: string[] = []
  for (const [ef, hours] of perHour) {
    const feature = ef.split('::')[1]
    const limit = KNOWN_HOURLY_LIMITS[feature]
    if (!limit) continue
    const hitHours = [...hours.values()].filter(v => v >= limit).length
    if (hitHours >= 3) offenders.push(`${ef} (${hitHours} horas al limite de ${limit} en las ultimas 3h)`)
  }
  return offenders.length ? { fired: true, detail: offenders.join('; ') } : { fired: false }
}

// ── P0.2 -- rafaga de emails (suma real de las ultimas 10 ventanas de minuto) ──
async function sigEmailBurst(sb: SupabaseClient): Promise<SignalOutcome> {
  const { data: recent, error } = await sb
    .from('ai_rate_limits')
    .select('doctor_id')
    .eq('feature', 'send_email_user')
    .not('doctor_id', 'is', null)
    .gte('window_start', new Date(Date.now() - 30 * 60_000).toISOString())
  if (error) throw error

  const doctorIds = [...new Set((recent || []).map((r: any) => r.doctor_id))]
  const offenders: string[] = []

  for (const docId of doctorIds) {
    const { data: rows, error: e2 } = await sb
      .from('ai_rate_limits')
      .select('request_count')
      .eq('feature', 'send_email_user')
      .eq('doctor_id', docId as string)
      .order('window_start', { ascending: false })
      .limit(10)
    if (e2) throw e2
    const total = (rows || []).reduce((s: number, r: any) => s + r.request_count, 0)
    if (total > 10) offenders.push(`medico ${docId}: ${total} emails en las ultimas 10 ventanas de minuto`)
  }
  return offenders.length ? { fired: true, detail: offenders.join('; ') } : { fired: false }
}

// ── P0.3 -- actividad admin anomala ─────────────────────────────────────────
async function sigAdminBurst(sb: SupabaseClient): Promise<SignalOutcome> {
  const { data, error } = await sb
    .from('admin_action_logs')
    .select('actor_user_id')
    .eq('result', 'success')
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
  if (error) throw error

  const counts = new Map<string, number>()
  for (const r of (data || []) as any[]) {
    const k = r.actor_user_id || 'unknown'
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const offenders = [...counts.entries()].filter(([, c]) => c >= 20)
  return offenders.length
    ? { fired: true, detail: offenders.map(([k, c]) => `actor ${k}: ${c} acciones en 10 min`).join('; ') }
    : { fired: false }
}

// ── P1.1 -- consumo de IA >2x el historico (excluye la hora en curso) ───────
async function sigIaSpike(sb: SupabaseClient): Promise<SignalOutcome> {
  const now = new Date()
  const currentHourStart = new Date(now); currentHourStart.setUTCMinutes(0, 0, 0)
  // "actual" para comparar = la ultima hora YA COMPLETA, nunca la hora
  // en curso (evita falsos positivos por comparar una hora a medias)
  const lastCompleteHourStart = new Date(currentHourStart.getTime() - 3600_000)
  const lastCompleteHourEnd   = currentHourStart

  const { data: currentData, error } = await sb
    .from('ai_usage_logs')
    .select('doctor_id, feature, input_tokens, output_tokens')
    .gte('created_at', lastCompleteHourStart.toISOString())
    .lt('created_at', lastCompleteHourEnd.toISOString())
  if (error) throw error
  if (!currentData?.length) return { fired: false }

  const currentTotals = new Map<string, number>()
  for (const r of currentData as any[]) {
    const k = `${r.doctor_id}::${r.feature}`
    currentTotals.set(k, (currentTotals.get(k) || 0) + (r.input_tokens || 0) + (r.output_tokens || 0))
  }

  // historico: misma hora-del-dia, ultimos 7 dias, EXCLUYENDO la hora
  // que se esta evaluando como "actual" arriba
  const hourOfDay = lastCompleteHourStart.getUTCHours()
  const sevenDaysAgo = new Date(lastCompleteHourStart.getTime() - 7 * 24 * 3600_000)
  const { data: histData, error: e2 } = await sb
    .from('ai_usage_logs')
    .select('doctor_id, feature, input_tokens, output_tokens, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .lt('created_at', lastCompleteHourStart.toISOString())
  if (e2) throw e2

  const perDay = new Map<string, number>()
  for (const r of (histData || []) as any[]) {
    const d = new Date(r.created_at)
    if (d.getUTCHours() !== hourOfDay) continue
    const dayKey = d.toISOString().slice(0, 10)
    const k = `${r.doctor_id}::${r.feature}::${dayKey}`
    perDay.set(k, (perDay.get(k) || 0) + (r.input_tokens || 0) + (r.output_tokens || 0))
  }
  const histByEf = new Map<string, number[]>()
  for (const [k, sum] of perDay) {
    const parts = k.split('::')
    const ef = `${parts[0]}::${parts[1]}`
    if (!histByEf.has(ef)) histByEf.set(ef, [])
    histByEf.get(ef)!.push(sum)
  }

  const offenders: string[] = []
  for (const [ef, current] of currentTotals) {
    const days = histByEf.get(ef)
    if (!days?.length) continue // sin historico -- no comparar, evita falso positivo de "primera vez"
    const avg = days.reduce((a, b) => a + b, 0) / days.length
    if (avg > 0 && current > avg * 2) {
      offenders.push(`${ef}: ${current} tokens vs. promedio historico ${avg.toFixed(0)}`)
    }
  }
  return offenders.length ? { fired: true, detail: offenders.join('; ') } : { fired: false }
}

// ── P1.2 -- batch ejecutandose anormalmente ─────────────────────────────────
async function sigBatchAbnormal(sb: SupabaseClient): Promise<SignalOutcome> {
  const features = ['growth_daily_batch', 'showcase_batch', 'scout_leads']
  const { data, error } = await sb
    .from('ai_rate_limits')
    .select('feature, window_start, request_count')
    .in('feature', features)
    .eq('ip', 'system')
    .gte('window_start', new Date(Date.now() - 3 * 3600_000).toISOString())
  if (error) throw error

  const perHour = new Map<string, Map<string, number>>()
  for (const r of (data || []) as any[]) {
    const h = new Date(r.window_start); h.setUTCMinutes(0, 0, 0)
    const hKey = h.toISOString()
    if (!perHour.has(r.feature)) perHour.set(r.feature, new Map())
    const m = perHour.get(r.feature)!
    m.set(hKey, (m.get(hKey) || 0) + r.request_count)
  }

  const offenders: string[] = []
  for (const [feature, hours] of perHour) {
    const limit = KNOWN_HOURLY_LIMITS[feature]
    if (!limit) continue
    const hits = [...hours.values()].filter(v => v >= limit).length
    if (hits >= 2) offenders.push(`${feature}: ${hits} horas al limite en las ultimas 3h`)
  }
  return offenders.length ? { fired: true, detail: offenders.join('; ') } : { fired: false }
}

// ── P1.3 -- meta publish anormal ────────────────────────────────────────────
async function sigMetaPublishBurst(sb: SupabaseClient): Promise<SignalOutcome> {
  const { count, error } = await sb
    .from('admin_action_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'meta-publish')
    .eq('result', 'success')
    .gte('created_at', new Date(Date.now() - 3600_000).toISOString())
  if (error) throw error
  return (count || 0) > 5 ? { fired: true, detail: `${count} publicaciones exitosas en la ultima hora` } : { fired: false }
}

// ── P2.1 -- probing 403 admin ────────────────────────────────────────────────
async function sigProbing403(sb: SupabaseClient): Promise<SignalOutcome> {
  const { data, error } = await sb
    .from('admin_action_logs')
    .select('actor_user_id')
    .eq('result', 'denied')
    .eq('metadata->>status', '403')
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
  if (error) throw error

  const counts = new Map<string, number>()
  for (const r of (data || []) as any[]) {
    const k = r.actor_user_id || 'unknown'
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const offenders = [...counts.entries()].filter(([, c]) => c >= 10)
  return offenders.length
    ? { fired: true, detail: offenders.map(([k, c]) => `actor ${k}: ${c} rechazos 403 en 10 min`).join('; ') }
    : { fired: false }
}

// ── P2.2 -- probing 401 (limitacion conocida: no ve lo que bloquea el gateway) ──
async function sigProbing401(sb: SupabaseClient): Promise<SignalOutcome> {
  const { count, error } = await sb
    .from('admin_action_logs')
    .select('*', { count: 'exact', head: true })
    .eq('result', 'denied')
    .eq('metadata->>status', '401')
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
  if (error) throw error
  return (count || 0) >= 10 ? { fired: true, detail: `${count} rechazos 401 (identidad invalida) en 10 min` } : { fired: false }
}

const SIGNALS: { name: string; level: string; label: string; fn: (sb: SupabaseClient) => Promise<SignalOutcome> }[] = [
  { name: 'rate_limit_repeated',  level: 'P0', label: 'Rate limit alcanzado repetidamente', fn: sigRateLimitRepeated },
  { name: 'email_burst',          level: 'P0', label: 'Ráfaga de emails',                    fn: sigEmailBurst },
  { name: 'admin_burst',          level: 'P0', label: 'Actividad admin anómala',              fn: sigAdminBurst },
  { name: 'ia_spike',             level: 'P1', label: 'Consumo de IA por encima del patrón',  fn: sigIaSpike },
  { name: 'batch_abnormal',       level: 'P1', label: 'Batch ejecutándose anormalmente',      fn: sigBatchAbnormal },
  { name: 'meta_publish_burst',   level: 'P1', label: 'Meta publish anormal',                 fn: sigMetaPublishBurst },
  { name: 'probing_403',          level: 'P2', label: 'Probing 403 administrativo',           fn: sigProbing403 },
  { name: 'probing_401',          level: 'P2', label: 'Probing 401 / rechazos de identidad',  fn: sigProbing401 },
]

async function sendAlertEmail(level: string, label: string, detail: string): Promise<void> {
  const res = await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SRV}` },
    body: JSON.stringify({ type: 'security_alert', to_email: ALERT_TO_EMAIL, level, label, detail }),
  })
  // fetch() no tira excepcion por un 4xx/5xx -- sin este chequeo, un
  // fallo real de send-email se reportaria como alerta enviada.
  if (!res.ok) throw new Error(`send-email respondio ${res.status}`)
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

  const alertsFired: string[] = []
  const failedSignals: string[] = []

  for (const sig of SIGNALS) {
    try {
      const r = await sig.fn(sb)
      if (r.fired) {
        // Cooldown -- feature='alert:<tipo>' es una convencion de control,
        // nunca una metrica de consumo real (ver rate-limit.ts).
        const cd = await checkRateLimit(`alert:${sig.name}`, null, 'system')
        if (cd.allowed) {
          try {
            await sendAlertEmail(sig.level, sig.label, r.detail || '')
            alertsFired.push(sig.name)
          } catch {
            // fail-open: si el envio de la alerta falla, no tumba el resto
            failedSignals.push(`${sig.name} (envio)`)
          }
        }
      }
    } catch (e) {
      console.error(`[abuse-detector] señal ${sig.name} fallo:`, e)
      failedSignals.push(sig.name)
    }
  }

  // Heartbeat explicito -- independiente del auto-log de requireAdmin
  // (que a proposito no loguea exitos de service_role). Fail-open: si
  // esto falla, no debe romper la respuesta de la funcion.
  try {
    await sb.from('admin_action_logs').insert({
      actor_user_id: null,
      action: 'abuse-detector-heartbeat',
      resource_type: 'abuse-detector-heartbeat',
      resource_id: null,
      result: 'success',
      ip: 'system',
      metadata: {
        signals_ok: SIGNALS.length - failedSignals.length,
        signals_failed: failedSignals,
        alerts_fired: alertsFired,
      },
    })
  } catch (_) { /* fail-open */ }

  return new Response(JSON.stringify({
    ok: true,
    signals_ok: SIGNALS.length - failedSignals.length,
    signals_failed: failedSignals,
    alerts_fired: alertsFired,
  }), { headers: { 'Content-Type': 'application/json' } })
})
