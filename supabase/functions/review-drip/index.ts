import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

// ── FREEZE (18 ago 2026) ────────────────────────────────────────────────────
// El cron que disparaba esta función corría cada hora desde su creación con
// un current_setting() que Supabase rechaza -- fallaba en silencio siempre.
// Al corregir el cron se destapó el backlog completo de citas pendientes y
// se enviaron 28 correos reales de una sola vez (9 a pacientes reales de un
// médico real, con citas de hace ~2 meses). Congelado a propósito hasta
// implementar idempotencia real + ventana de elegibilidad (solo citas
// recientes) -- no reactivar sin eso. Ver incidents/2026-08-18-review-drip-backlog.md.
const FROZEN = true

Deno.serve(async () => {
  if (FROZEN) {
    return new Response(JSON.stringify({ ok: false, frozen: true, reason: 'review-drip congelado tras incidente de backlog -- ver incidents/2026-08-18-review-drip-backlog.md' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // HH:MM de hace 2 horas — para filtrar citas de hoy que ya terminaron
    const twoHoursAgoHHMM = new Date(now.getTime() - 2 * 3600000)
      .toTimeString().slice(0, 5)

    // Ventana de elegibilidad MÁXIMA (18 ago 2026, post-incidente): una cita
    // que nunca recibió solicitud no puede convertirse en un email meses
    // después solo porque el cron estuvo caído. Sin este límite inferior de
    // fecha, cualquier backlog histórico con review_sent=false volvería a
    // salir completo la primera vez que el cron corra tras un fallo largo --
    // exactamente lo que pasó. 3 días es generoso para el ritmo horario
    // normal del cron y corta de raíz cualquier reprocesamiento tardío.
    const MAX_DAYS_BACK = 3
    const cutoffDate = new Date(now.getTime() - MAX_DAYS_BACK * 86400000)
      .toISOString().split('T')[0]

    const { data: allCitas } = await sb
      .from('citas')
      .select('id, medico_id, paciente_email, paciente_nombre, fecha, hora')
      .gte('fecha', cutoffDate)
      .lte('fecha', today)
      .neq('estado', 'cancelada')
      .eq('review_sent', false)
      .not('paciente_email', 'is', null)

    // Dentro de la ventana: días pasados (ya cubiertos por el cutoff de arriba)
    // todas; citas de hoy solo si la hora ya pasó hace 2h+.
    const citas = (allCitas || []).filter(c =>
      c.fecha < today || (c.hora && c.hora.slice(0, 5) <= twoHoursAgoHHMM)
    )

    let sent = 0
    for (const cita of citas) {
      const { data: m } = await sb
        .from('medicos')
        .select('nombre, apellido, titulo, slug, plan')
        .eq('id', cita.medico_id)
        .single()

      if (!m) continue
      // review_sent representa un ENVÍO REAL, nunca una exclusión -- si el
      // médico no es plan pago hoy, simplemente no se toca la fila. Si más
      // adelante pasa a un plan pago, esta misma cita vuelve a ser candidata
      // (siempre que siga dentro de la ventana de MAX_DAYS_BACK).
      if (!['pro', 'destacado', 'pro_web'].includes(m.plan)) continue

      // La página real vive en el frontend de CitaDoc (Vercel), no en el edge
      // function -- cita-review queda intacto solo para no romper los links ya
      // enviados en emails viejos. cita-review/index.ts NO se toca.
      const reviewUrl = `https://citadoc.lat/resena/${cita.id}?medico_id=${cita.medico_id}`

      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          type:            'post_consulta',
          to_email:        cita.paciente_email,
          paciente_nombre: cita.paciente_nombre,
          doctor_nombre:   `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`,
          doctor_slug:     m.slug,
          review_url:      reviewUrl,
        }),
      }).catch(() => {})

      await sb.from('citas').update({ review_sent: true }).eq('id', cita.id)
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
