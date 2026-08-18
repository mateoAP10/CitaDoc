import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

// ── FREEZE levantado (18 ago 2026) ──────────────────────────────────────────
// Congelado tras el incidente documentado en
// incidents/2026-08-18-review-drip-backlog.md. Descongelado recién después de:
// ventana de elegibilidad (2h-3 días, no más backlog histórico), review_sent
// representa un envío real (nunca una exclusión), claim atómico (cierra la
// carrera SELECT->enviar->UPDATE), y una prueba de producción controlada con
// una sola cita real aislada, confirmando cero backlog real elegible antes de
// descongelar. Ver el incident report para el detalle completo.
const FROZEN = false

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

    // ── Claim atómico (18 ago 2026, auditoría de concurrencia) ────────────────
    // El código anterior hacía SELECT -> enviar -> UPDATE: dos corridas
    // concurrentes (cron solapado, reintento manual, doble disparo del
    // gateway) podían leer la misma cita como elegible ANTES de que
    // cualquiera de las dos la marcara, y las dos mandaban el email.
    // Acá review_sent pasa a true en la MISMA sentencia UPDATE que la
    // selecciona (PostgREST: update()+select() = un solo UPDATE...RETURNING
    // atómico). Postgres serializa UPDATEs concurrentes sobre las mismas
    // filas -- la segunda corrida, sea cual sea el orden de llegada, ve
    // review_sent ya en true y esa fila simplemente no aparece en su propio
    // resultado. Nunca dos corridas pueden reclamar la misma cita.
    // Se separa en dos claims (días pasados / hoy) porque PostgREST no
    // expresa limpiamente "fecha<hoy OR (fecha=hoy AND hora<=corte)" sin
    // construir el OR a mano -- cada claim sigue siendo una sola sentencia
    // atómica, mismo resultado que el filtro original.
    const selectCols = 'id, medico_id, paciente_email, paciente_nombre, fecha, hora'

    const { data: claimedPastDays } = await sb
      .from('citas')
      .update({ review_sent: true })
      .eq('review_sent', false)
      .neq('estado', 'cancelada')
      .not('paciente_email', 'is', null)
      .gte('fecha', cutoffDate)
      .lt('fecha', today)
      .select(selectCols)

    const { data: claimedToday } = await sb
      .from('citas')
      .update({ review_sent: true })
      .eq('review_sent', false)
      .neq('estado', 'cancelada')
      .not('paciente_email', 'is', null)
      .eq('fecha', today)
      .lte('hora', twoHoursAgoHHMM)
      .select(selectCols)

    const citas = [...(claimedPastDays || []), ...(claimedToday || [])]

    // revert(): review_sent representa un ENVÍO REAL, nunca una exclusión.
    // Si esta corrida reclamó la fila pero al final no manda el email (plan
    // no pago, o el envío realmente falla), se libera para que una corrida
    // futura pueda reclamarla de nuevo -- perder un reintento es aceptable,
    // duplicar un envío no.
    async function revert(citaId: string) {
      await sb.from('citas').update({ review_sent: false }).eq('id', citaId)
    }

    let sent = 0
    for (const cita of citas) {
      const { data: m } = await sb
        .from('medicos')
        .select('nombre, apellido, titulo, slug, plan')
        .eq('id', cita.medico_id)
        .single()

      if (!m) { await revert(cita.id); continue }
      if (!['pro', 'destacado', 'pro_web'].includes(m.plan)) { await revert(cita.id); continue }

      // La página real vive en el frontend de CitaDoc (Vercel), no en el edge
      // function -- cita-review queda intacto solo para no romper los links ya
      // enviados en emails viejos. cita-review/index.ts NO se toca.
      const reviewUrl = `https://citadoc.lat/resena/${cita.id}?medico_id=${cita.medico_id}`

      const emailRes = await fetch(SEND_EMAIL_URL, {
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
      }).catch(() => null)

      // Antes esto no se revisaba -- un fallo real de red se marcaba igual
      // como "enviado". Ahora un fallo real (network o status no-2xx) revierte
      // el claim para que se reintente en la próxima corrida.
      if (!emailRes || !emailRes.ok) { await revert(cita.id); continue }

      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
