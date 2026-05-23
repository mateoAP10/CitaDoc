import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

function profileScore(m: any): number {
  let score = 0
  if (m.foto_url)                                           score += 25
  if (m.bio && m.bio.length > 20)                          score += 20
  if (m.horarios_config || (m.dias_atencion?.length > 0))  score += 25
  if (m.precio > 0)                                        score += 15
  if (m.especialidades?.length > 0)                        score += 15
  return score
}

// Returns the single most critical insight key
function pickInsight(m: any, citasSemana: number, citasTotal: number): string {
  const score = profileScore(m)
  const tieneHorarios = !!(m.horarios_config || m.dias_atencion?.length > 0)
  const isPro = m.plan === 'pro' || m.plan === 'destacado' || m.plan === 'pro_web'

  if (!tieneHorarios)                              return 'sin_horarios'
  if (!m.foto_url)                                 return 'sin_foto'
  if (citasSemana === 0 && citasTotal === 0 && !isPro) return 'sin_citas_comparte'
  if (score < 60)                                  return 'perfil_incompleto'
  if (citasSemana > 0 && !isPro)                   return 'upsell_pro'
  if (citasSemana === 0 && tieneHorarios)          return 'agenda_vacia'
  if (citasSemana > 0 && isPro)                    return 'excelente'
  return 'sin_citas_comparte'
}

Deno.serve(async () => {
  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()

    // Ventana: últimos 7 días
    const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString()

    // Médicos activos registrados hace > 3 días
    const cutoff = new Date(now.getTime() - 3 * 86_400_000).toISOString()
    const { data: medicos } = await sb
      .from('medicos')
      .select('id, email, nombre, apellido, titulo, slug, foto_url, bio, precio, especialidades, horarios_config, dias_atencion, plan, created_at')
      .eq('activo', true)
      .lt('created_at', cutoff)

    // Citas de la última semana
    const { data: citasSemanaRows } = await sb
      .from('citas')
      .select('medico_id')
      .gte('created_at', weekStart)
      .neq('estado', 'cancelada')

    // Citas totales por médico
    const { data: citasTotalesRows } = await sb
      .from('citas')
      .select('medico_id')
      .neq('estado', 'cancelada')

    const semanaMap: Record<string, number> = {}
    for (const c of citasSemanaRows || []) {
      semanaMap[c.medico_id] = (semanaMap[c.medico_id] || 0) + 1
    }
    const totalMap: Record<string, number> = {}
    for (const c of citasTotalesRows || []) {
      totalMap[c.medico_id] = (totalMap[c.medico_id] || 0) + 1
    }

    let sent = 0
    for (const m of medicos || []) {
      const citasSemana = semanaMap[m.id] || 0
      const citasTotal  = totalMap[m.id]  || 0
      const score       = profileScore(m)
      const insight     = pickInsight(m, citasSemana, citasTotal)

      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          type:         'weekly_report',
          to_email:     m.email,
          nombre:       m.nombre,
          titulo:       m.titulo,
          slug:         m.slug,
          citas_semana: citasSemana,
          citas_total:  citasTotal,
          score,
          insight,
        }),
      }).catch(() => {})

      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
