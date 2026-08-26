import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// x-forwarded-for trae una cadena "cliente_real, hop1, hop2..." -- en el
// gateway de Supabase el ultimo hop rota por request (confirmado
// empiricamente: 3 llamadas seguidas del mismo curl trajeron 3 IPs
// finales distintas), asi que usar el header entero como key hace que
// cada request tenga una key distinta y el rate limit nunca se cumpla.
// El primer segmento es el cliente real -- es el unico establo.
export function getClientIp(req: Request): string {
  const raw = req.headers.get('x-forwarded-for') || ''
  return raw.split(',')[0]?.trim() || 'unknown'
}

// Rate limits per feature per minute
const LIMITS: Record<string, { per_min: number; per_hour: number }> = {
  voice_extraction:   { per_min: 10, per_hour: 60 },
  voice_assistant_intent: { per_min: 15, per_hour: 80 },
  // El chat ya no es solo documentos -- es el motor central (Action
  // Engine: pacientes/agenda/consultas/dashboard + documentos), así que
  // recibe muchos más turnos por sesión de lo que se diseñó originalmente.
  // 20/min se agotaba real en pruebas y el error quedaba genérico
  // ("No pude procesar eso") sin decir que era rate limit.
  voice_assistant_chat:   { per_min: 40, per_hour: 400 },
  summary_generation: { per_min: 3,  per_hour: 20 },
  growth_content:     { per_min: 3,  per_hour: 15 },

  // ── Observabilidad P0 -- matriz de rate limit aprobada por Mateo ──────────
  // 👨‍⚕️ Usuario (key: doctor_id)
  website_config:      { per_min: 3,  per_hour: 10 },
  send_email_user:      { per_min: 15, per_hour: 100 },
  // 🌐 Público (key: ip -- sin doctor_id posible)
  triage_especialidad: { per_min: 3,  per_hour: 10 },
  tag_asset:            { per_min: 3,  per_hour: 15 },
  send_email_public:    { per_min: 10, per_hour: 30 },
  // 🛡️ Admin/sistema (key: ip='system' -- un solo actor de confianza, el
  // limite es fusible contra loop/cron duplicado/ejecucion manual
  // accidental, no defensa contra abuso externo -- esos ya estan gateados
  // por requireAdmin en P2.3). per_min se deja alto a proposito para que
  // solo el limite por hora importe.
  growth_daily_batch:          { per_min: 60, per_hour: 2 },
  showcase_batch:               { per_min: 60, per_hour: 2 },
  scout_leads:                  { per_min: 60, per_hour: 3 },
  generate_showcase_content:    { per_min: 5,  per_hour: 15 },
  generate_citadoc_content:     { per_min: 5,  per_hour: 30 },
  meta_campaigns:                { per_min: 5,  per_hour: 30 },
  meta_publish:                  { per_min: 60, per_hour: 5 },
  payphone_prepare:              { per_min: 5,  per_hour: 20 },

  default:            { per_min: 20, per_hour: 100 }
}

export async function checkRateLimit(
  feature: string,
  doctorId: string | null,
  ip: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = LIMITS[feature] || LIMITS.default
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const windowMin  = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString()
  const windowHour = new Date(Math.floor(now.getTime() / 3600000) * 3600000).toISOString()
  const key = doctorId || ip

  // Check minute window
  const { data: minData } = await supabase
    .from('ai_rate_limits')
    .select('id, request_count')
    .eq('feature', feature)
    .eq(doctorId ? 'doctor_id' : 'ip', key)
    .eq('window_start', windowMin)
    .maybeSingle()

  if (minData && minData.request_count >= limits.per_min) {
    return { allowed: false, reason: `Rate limit: max ${limits.per_min} requests/min for ${feature}` }
  }

  // Check hour window
  const { data: hourRows } = await supabase
    .from('ai_rate_limits')
    .select('request_count')
    .eq('feature', feature)
    .eq(doctorId ? 'doctor_id' : 'ip', key)
    .gte('window_start', windowHour)

  const hourTotal = (hourRows || []).reduce((s, r) => s + r.request_count, 0)
  if (hourTotal >= limits.per_hour) {
    return { allowed: false, reason: `Rate limit: max ${limits.per_hour} requests/hour for ${feature}` }
  }

  // Increment counter.
  if (doctorId) {
    // Autenticado/system: el UNIQUE (doctor_id,feature,window_start) de
    // siempre soporta upsert nativo sin problema (doctor_id nunca es NULL
    // en esta rama).
    await supabase.from('ai_rate_limits').upsert({
      doctor_id:     doctorId,
      ip:            null,
      feature,
      window_start:  windowMin,
      request_count: (minData?.request_count || 0) + 1
    }, { onConflict: 'doctor_id,feature,window_start', ignoreDuplicates: false })
  } else {
    // Anonimo: PostgREST no puede apuntar ON CONFLICT a un indice unico
    // parcial (confirmado: error 42P10 "no unique or exclusion
    // constraint matching" contra el indice
    // ai_rate_limits_anon_ip_feature_window_key WHERE doctor_id IS NULL)
    // -- se resuelve con lectura+escritura explicita usando el id ya
    // leido arriba, en vez de upsert. El indice parcial igual protege la
    // integridad de datos a nivel SQL (evita filas duplicadas si algo
    // mas escribe directo), solo no lo puede usar el cliente para
    // resolver el conflicto automaticamente.
    if (minData?.id) {
      await supabase.from('ai_rate_limits')
        .update({ request_count: minData.request_count + 1 })
        .eq('id', minData.id)
    } else {
      await supabase.from('ai_rate_limits').insert({
        doctor_id:     null,
        ip,
        feature,
        window_start:  windowMin,
        request_count: 1
      })
    }
  }

  return { allowed: true }
}
