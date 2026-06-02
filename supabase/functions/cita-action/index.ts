import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY)

const BASE_STYLES = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:24px 16px}.card{width:100%;max-width:400px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.10)}.header{padding:40px 32px 32px;text-align:center}.icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:22px}.chip{display:inline-block;padding:4px 14px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px}h1{font-size:22px;font-weight:700;line-height:1.3;margin-bottom:8px}p.sub{font-size:14px;opacity:.6;margin:0}.body{padding:28px 32px 32px}.detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9}.detail-row:last-of-type{border-bottom:none}.detail-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8}.detail-value{font-size:14px;font-weight:600;color:#0f172a;text-align:right}.cta{display:block;margin-top:24px;padding:14px;border-radius:12px;text-align:center;font-size:15px;font-weight:700;text-decoration:none}.footer{margin-top:20px;text-align:center;font-size:11px;color:#cbd5e1}`

function pageConfirmed(doctorName: string, fecha: string, hora: string, modalidad: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>Cita Confirmada</title>
<style>${BASE_STYLES}body{background:#f0fdf4}.header{background:linear-gradient(135deg,#052a27,#0a3d35)}.icon{background:rgba(255,255,255,.12)}.chip{background:rgba(255,255,255,.15);color:rgba(255,255,255,.7)}h1{color:#fff}p.sub{color:rgba(255,255,255,.55)}.cta{background:#f0fdf4;color:#065f46}</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon">✓</div>
    <div class="chip">Asistencia confirmada</div>
    <h1>¡Nos vemos el ${fecha}!</h1>
    <p class="sub">Con ${doctorName}</p>
  </div>
  <div class="body">
    <div class="detail-row">
      <span class="detail-label">Fecha</span>
      <span class="detail-value">${fecha}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Hora</span>
      <span class="detail-value">${hora}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Médico</span>
      <span class="detail-value">${doctorName}</span>
    </div>
    ${modalidad ? `<div class="detail-row">
      <span class="detail-label">Modalidad</span>
      <span class="detail-value">${modalidad}</span>
    </div>` : ''}
    <p class="footer">CitaDoc · hola@citadoc.lat</p>
  </div>
</div>
</body></html>`
}

function pageCancelled(doctorName: string, fecha: string, hora: string, profileUrl: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>Cita Cancelada</title>
<style>${BASE_STYLES}body{background:#f8fafc}.header{background:linear-gradient(135deg,#0f172a,#1e293b)}.icon{background:rgba(255,255,255,.08)}.chip{background:rgba(255,255,255,.1);color:rgba(255,255,255,.5)}h1{color:#fff}p.sub{color:rgba(255,255,255,.45)}.cta{background:#0f172a;color:#fff}</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon">📅</div>
    <div class="chip">Cita cancelada</div>
    <h1>Tu cita quedó cancelada.</h1>
    <p class="sub">Los planes cambian — sin problema.</p>
  </div>
  <div class="body">
    <div class="detail-row">
      <span class="detail-label">Fecha</span>
      <span class="detail-value">${fecha}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Hora</span>
      <span class="detail-value">${hora}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Médico</span>
      <span class="detail-value">${doctorName}</span>
    </div>
    ${profileUrl ? `<a href="${profileUrl}" class="cta">Reagendar cita →</a>` : ''}
    <p class="footer">CitaDoc · hola@citadoc.lat</p>
  </div>
</div>
</body></html>`
}

function pageError(msg: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>CitaDoc</title>
<style>${BASE_STYLES}body{background:#f8fafc}.header{background:#f1f5f9}.icon{background:#e2e8f0}.chip{background:#e2e8f0;color:#94a3b8}h1{color:#0f172a}p.sub{color:#94a3b8}</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon">🔗</div>
    <div class="chip">Enlace inválido</div>
    <h1>${msg}</h1>
    <p class="sub">CitaDoc · hola@citadoc.lat</p>
  </div>
</div>
</body></html>`
}

serve(async (req) => {
  const url    = new URL(req.url)
  const action = url.searchParams.get('action')
  const citaId = url.searchParams.get('cita_id')
  const HTML   = { headers: { 'Content-Type': 'text/html' } }

  if (!citaId || !action) {
    return new Response(pageError('Enlace no válido o expirado.'), HTML)
  }

  const { data: cita, error } = await sb
    .from('citas')
    .select('*, medicos(titulo, nombre, apellido, email, slug)')
    .eq('id', citaId)
    .single()

  if (error || !cita) {
    return new Response(pageError('No pudimos encontrar esta cita.'), HTML)
  }

  // deno-lint-ignore no-explicit-any
  const medico     = (cita as any).medicos
  const doctorName = medico ? `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}` : 'tu médico'
  const doctorEmail= medico?.email
  const slug       = medico?.slug || ''
  const profileUrl = slug ? `https://citadoc.lat/citadoc-perfil.html?slug=${slug}` : ''
  const fecha      = new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const modalidad  = cita.modalidad === 'virtual' ? '💻 Virtual' : cita.modalidad === 'presencial' ? '🏥 Presencial' : ''

  // ── ALREADY CANCELLED ─────────────────────────────────────────────────────
  if (cita.estado === 'cancelada' && action !== 'cancel') {
    return new Response(pageCancelled(doctorName, fecha, cita.hora, profileUrl), HTML)
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────
  if (action === 'confirm') {
    await sb.from('citas').update({ paciente_confirmado: true }).eq('id', citaId)

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

    return new Response(pageConfirmed(doctorName, fecha, cita.hora, modalidad), HTML)
  }

  // ── CANCEL ────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    await sb.from('citas').update({ estado: 'cancelada', cancelada_at: new Date().toISOString() }).eq('id', citaId)

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

    return new Response(pageCancelled(doctorName, fecha, cita.hora, profileUrl), HTML)
  }

  // ── RESCHEDULE → perfil público ───────────────────────────────────────────
  if (action === 'reschedule') {
    return new Response(null, {
      status: 302,
      headers: { 'Location': profileUrl || 'https://citadoc.lat' }
    })
  }

  return new Response(pageError('Acción no reconocida.'), HTML)
})
