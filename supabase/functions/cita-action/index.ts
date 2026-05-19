import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY)

function htmlPage(title: string, body: string, color = '#10b981'): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>CitaDoc</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div style="max-width:420px;width:100%;margin:40px 16px;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;text-align:center;">
  <div style="background:${color};padding:40px 32px 32px;">
    <p style="margin:0 0 12px;color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</p>
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;line-height:1.2;">${title}</h1>
  </div>
  <div style="padding:32px;">
    ${body}
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">CitaDoc · hola@citadoc.lat</p>
  </div>
</div>
</body></html>`
}

serve(async (req) => {
  const url    = new URL(req.url)
  const action = url.searchParams.get('action')
  const citaId = url.searchParams.get('cita_id')

  if (!citaId || !action) {
    return new Response(htmlPage('Enlace inválido', '<p style="color:#6b7280;">Este enlace no es válido o ha expirado.</p>', '#ef4444'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Load cita + medico
  const { data: cita, error } = await sb
    .from('citas')
    .select('*, medicos(titulo, nombre, apellido, email, slug)')
    .eq('id', citaId)
    .single()

  if (error || !cita) {
    return new Response(htmlPage('Cita no encontrada', '<p style="color:#6b7280;">No pudimos encontrar esta cita.</p>', '#ef4444'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (cita.estado === 'cancelada') {
    return new Response(htmlPage('Cita ya cancelada', '<p style="color:#6b7280;">Esta cita ya fue cancelada anteriormente.</p>', '#64748b'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // deno-lint-ignore no-explicit-any
  const medico     = (cita as any).medicos
  const doctorName = medico ? `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}` : 'tu médico'
  const doctorEmail= medico?.email
  const slug       = medico?.slug || ''
  const profileUrl = `https://citadoc.lat/citadoc-perfil.html?slug=${slug}`
  const fecha      = new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  // ── CONFIRM ──────────────────────────────────────────────────────────────
  if (action === 'confirm') {
    // Notify doctor
    if (doctorEmail) {
      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:             'appointment',
          to_email:         doctorEmail,
          doctor_name:      doctorName,
          patient_name:     cita.paciente_nombre,
          appointment_date: fecha,
          appointment_time: cita.hora,
          location_name:    'Consultorio médico',
          appointment_mode: '✅ Paciente confirmó asistencia',
          public_profile_url: 'https://citadoc.lat/citadoc-dashboard.html',
        }),
      }).catch(() => {})
    }

    return new Response(htmlPage(
      '¡Cita confirmada!',
      `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">Tu cita con <strong>${doctorName}</strong><br>el <strong>${fecha} a las ${cita.hora}</strong><br>está confirmada.</p>
       <p style="color:#6b7280;font-size:13px;margin:0;">Le hemos notificado a tu médico.</p>`,
      '#10b981'
    ), { headers: { 'Content-Type': 'text/html' } })
  }

  // ── CANCEL ───────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    await sb.from('citas').update({ estado: 'cancelada' }).eq('id', citaId)

    // Notify doctor
    if (doctorEmail) {
      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:             'appointment',
          to_email:         doctorEmail,
          doctor_name:      doctorName,
          patient_name:     cita.paciente_nombre,
          appointment_date: fecha,
          appointment_time: cita.hora,
          location_name:    'Consultorio médico',
          appointment_mode: '❌ Paciente canceló la cita',
          public_profile_url: 'https://citadoc.lat/citadoc-dashboard.html',
        }),
      }).catch(() => {})
    }

    return new Response(htmlPage(
      'Cita cancelada',
      `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">Tu cita del <strong>${fecha} a las ${cita.hora}</strong> con <strong>${doctorName}</strong> ha sido cancelada.</p>
       <p style="color:#6b7280;font-size:13px;margin:0;">Tu médico ha sido notificado.</p>`,
      '#ef4444'
    ), { headers: { 'Content-Type': 'text/html' } })
  }

  // ── RESCHEDULE → redirect to profile ─────────────────────────────────────
  if (action === 'reschedule') {
    return new Response(null, {
      status: 302,
      headers: { 'Location': profileUrl }
    })
  }

  return new Response(htmlPage('Acción inválida', '<p style="color:#6b7280;">Acción no reconocida.</p>', '#64748b'), {
    headers: { 'Content-Type': 'text/html' }
  })
})
