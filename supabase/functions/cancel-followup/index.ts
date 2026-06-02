import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

Deno.serve(async () => {
  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()

    // Citas canceladas hace entre 45 y 75 minutos (ventana centrada en 1h)
    const from = new Date(now.getTime() - 75 * 60000).toISOString()
    const to   = new Date(now.getTime() - 45 * 60000).toISOString()

    const { data: citas } = await sb
      .from('citas')
      .select('id, medico_id, paciente_email, paciente_nombre, fecha, hora')
      .eq('estado', 'cancelada')
      .eq('reschedule_prompt_sent', false)
      .not('paciente_email', 'is', null)
      .gte('cancelada_at', from)
      .lte('cancelada_at', to)

    let sent = 0
    for (const cita of citas || []) {
      const { data: m } = await sb
        .from('medicos')
        .select('nombre, apellido, titulo, slug, plan')
        .eq('id', cita.medico_id)
        .single()

      if (!m) continue
      if (!['pro', 'destacado', 'pro_web'].includes(m.plan)) {
        await sb.from('citas').update({ reschedule_prompt_sent: true }).eq('id', cita.id)
        continue
      }

      const profileUrl = `https://citadoc.lat/citadoc-perfil.html?slug=${m.slug}`

      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          type:            'reschedule_prompt',
          to_email:        cita.paciente_email,
          paciente_nombre: cita.paciente_nombre,
          doctor_nombre:   `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`,
          profile_url:     profileUrl,
        }),
      }).catch(() => {})

      await sb.from('citas').update({ reschedule_prompt_sent: true }).eq('id', cita.id)
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
