import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-A2.5 -- funcion exclusivamente batch, sin caso de uso publico. Sin
// auth (verify_jwt=false, sin chequeo propio, sin chequeo de metodo -- el
// handler ni siquiera leia `req`) mandaba emails reales (nudges) y mutaba
// perfil_nudges_sent en cada invocacion. Unico caller legitimo: pg_cron
// (job "perfil-frio-daily"), sin Authorization hoy.

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL      = `${SUPABASE_URL}/functions/v1/send-email`

// Nudges con su ventana de tiempo mínimo post-registro
const NUDGES = [
  {
    key: 'sin_foto',
    type: 'perfil_frio_foto',
    minHours: 72,   // 3 días
    check: (m: any) => !m.foto_url,
  },
  {
    key: 'sin_horarios',
    type: 'perfil_frio_horarios',
    minHours: 120,  // 5 días
    check: (m: any) =>
      !m.horarios_config &&
      (!m.dias_atencion || m.dias_atencion.length === 0),
  },
  {
    key: 'sin_citas_14d',
    type: 'perfil_frio_sin_citas',
    minHours: 336,  // 14 días
    check: (m: any) => (m.citas_count ?? 0) === 0,
  },
]

Deno.serve(async (req) => {
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

  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()
    let totalSent = 0

    // Traer médicos activos registrados hace más de 3 días
    const cutoff = new Date(now.getTime() - 72 * 3_600_000).toISOString()
    const { data: medicos, error } = await sb
      .from('medicos')
      .select('id, email, nombre, titulo, slug, foto_url, horarios_config, dias_atencion, created_at, perfil_nudges_sent')
      .eq('activo', true)
      .lt('created_at', cutoff)

    if (error) throw error

    // Traer conteo de citas por médico (para el nudge sin_citas_14d)
    const { data: citasCounts } = await sb
      .from('citas')
      .select('medico_id')

    const citasMap: Record<string, number> = {}
    for (const c of citasCounts || []) {
      citasMap[c.medico_id] = (citasMap[c.medico_id] || 0) + 1
    }

    for (const m of medicos || []) {
      const sent       = (m.perfil_nudges_sent || []) as string[]
      const hoursOld   = (now.getTime() - new Date(m.created_at).getTime()) / 3_600_000
      const mWithCitas = { ...m, citas_count: citasMap[m.id] || 0 }

      for (const nudge of NUDGES) {
        if (sent.includes(nudge.key)) continue
        if (hoursOld < nudge.minHours) continue
        if (!nudge.check(mWithCitas)) continue

        await fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            type:    nudge.type,
            to_email: m.email,
            nombre:  m.nombre,
            titulo:  m.titulo,
            slug:    m.slug,
          }),
        }).catch(() => {})

        await sb
          .from('medicos')
          .update({ perfil_nudges_sent: [...sent, nudge.key] })
          .eq('id', m.id)

        sent.push(nudge.key) // evitar doble envío en misma corrida
        totalSent++
        break // un nudge por médico por día
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
