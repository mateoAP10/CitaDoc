import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

Deno.serve(async () => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Citas pasadas, no canceladas, sin review enviado, con email de paciente
    const { data: citas } = await sb
      .from('citas')
      .select('id, medico_id, paciente_email, paciente_nombre, fecha, hora')
      .lt('fecha', new Date().toISOString().split('T')[0])
      .neq('estado', 'cancelada')
      .eq('review_sent', false)
      .not('paciente_email', 'is', null)

    let sent = 0
    for (const cita of citas || []) {
      // Obtener datos del médico
      const { data: m } = await sb
        .from('medicos')
        .select('nombre, apellido, titulo, slug, foto_url')
        .eq('id', cita.medico_id)
        .single()

      if (!m) continue

      const reviewUrl = `${SUPABASE_URL}/functions/v1/cita-review?cita_id=${cita.id}&medico_id=${cita.medico_id}`

      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          type:            'review_request',
          to_email:        cita.paciente_email,
          paciente_nombre: cita.paciente_nombre,
          doctor_nombre:   `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`,
          doctor_slug:     m.slug,
          review_url:      reviewUrl,
          fecha:           cita.fecha,
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
