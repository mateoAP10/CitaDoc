import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL.replace('supabase.co','supabase.co')}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY)

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Citas que ocurren entre 11.5h y 12.5h desde ahora
    const { data: citas, error } = await sb
      .from('citas')
      .select(`
        id, fecha, hora, paciente_nombre, paciente_email, modalidad, location_id,
        medico_id,
        medicos ( titulo, nombre, apellido, slug )
      `)
      .eq('estado', 'confirmada')
      .eq('reminder_sent', false)
      .not('paciente_email', 'is', null)
      .filter(
        'fecha::text || \' \' || hora',
        'gte',
        new Date(Date.now() + 11.5 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16)
      )
      .filter(
        'fecha::text || \' \' || hora',
        'lte',
        new Date(Date.now() + 12.5 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16)
      )

    if (error) {
      console.error('[reminders] Query error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!citas || citas.length === 0) {
      console.log('[reminders] No appointments in window')
      return new Response(JSON.stringify({ ok: true, sent: 0 }))
    }

    console.log('[reminders] Found', citas.length, 'appointments to remind')

    const results = await Promise.allSettled(citas.map(async (cita) => {
      // deno-lint-ignore no-explicit-any
      const medico = (cita as any).medicos
      const doctorName = medico
        ? `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}`.trim()
        : 'tu médico'

      const slug = medico?.slug || ''
      const fecha = new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
      const modalidad = cita.modalidad === 'virtual' ? '💻 Virtual' : '🏥 Presencial'
      const profileUrl = `https://citadoc.lat/citadoc-perfil.html?slug=${slug}`

      // Send reminder email
      const res = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:             'reminder',
          to_email:         cita.paciente_email,
          doctor_name:      doctorName,
          patient_name:     cita.paciente_nombre,
          appointment_date: fecha,
          appointment_time: cita.hora,
          appointment_mode: modalidad,
          public_profile_url: profileUrl,
          cita_id:          cita.id,
        }),
      })

      if (!res.ok) throw new Error(`send-email failed: ${res.status}`)

      // Mark as reminded
      await sb.from('citas').update({ reminder_sent: true }).eq('id', cita.id)
      console.log('[reminders] Reminded:', cita.id, cita.paciente_email)
    }))

    const sent   = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) console.warn('[reminders] Failed:', failed)

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[reminders] Error:', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })
  }
})
