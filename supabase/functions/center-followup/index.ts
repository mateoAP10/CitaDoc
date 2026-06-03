import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendEmail(type: string, data: Record<string, unknown>) {
  try {
    await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ type, ...data }),
    })
  } catch(e) { console.warn('[center-followup] sendEmail error:', e) }
}

function fmtDate(dateStr: string) {
  const [y,m,d] = dateStr.split('-').map(Number)
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${d} de ${months[m-1]} de ${y}`
}

function fmtServices(servicios: unknown): string {
  if (!servicios) return ''
  try {
    const arr = typeof servicios === 'string' ? JSON.parse(servicios) : servicios as {nombre:string}[]
    return arr.map((s:{nombre:string}) => s.nombre).join(', ')
  } catch { return '' }
}

// Helper: join citas + patients + centers
async function getCitasWithPatient(filters: Record<string, unknown>, extra?: string) {
  let q = sb.from('center_citas')
    .select('*, center_patients(nombre, email, telefono, cedula), centers(nombre, email, whatsapp, telefono, slug)')
  for (const [k, v] of Object.entries(filters)) {
    // deno-lint-ignore no-explicit-any
    q = (q as any).eq(k, v)
  }
  if (extra === 'has_email') q = (q as any).not('center_patients.email', 'is', null)
  return q.limit(100)
}

// ── Helper: nombre del médico principal de un centro ──────────────────────
function extractDoctorName(center: Record<string, unknown>): string | null {
  // deno-lint-ignore no-explicit-any
  const docs: any[] = (center.center_doctors as any[]) || []
  if (!docs.length) return null
  const sorted = [...docs].sort((a, b) => (a.orden||0) - (b.orden||0))
  const m = sorted[0]?.medicos
  if (!m) return null
  return `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`.trim()
}

// ── 1. NUEVA CITA ── siempre envía recordatorio simple al paciente ──────────
async function runConfirmaciones() {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from('center_citas')
    .select('id, center_id, fecha_pref, hora, servicios, center_patients(nombre, email), centers(nombre, whatsapp, telefono, center_doctors(orden, medicos(nombre, apellido, titulo)))')
    .is('email_confirm_at', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(50)

  if (!data?.length) return 0
  let sent = 0
  for (const c of data) {
    const p      = c.center_patients as { nombre: string; email?: string }
    const center = c.centers as Record<string, unknown>
    if (!p?.email) continue

    await sendEmail('center_reminder', {
      to_email:    p.email,
      patient_name: p.nombre,
      center_name:  center.nombre,
      doctor_name:  extractDoctorName(center),
      fecha:        c.fecha_pref ? fmtDate(c.fecha_pref) : null,
      hora:         c.hora || null,
      servicios:    fmtServices(c.servicios),
    })

    await sb.from('center_citas')
      .update({ email_confirm_at: new Date().toISOString(), followup_confirm_sent: true })
      .eq('id', c.id)
    sent++
  }
  console.log(`[center-followup] confirmaciones: ${sent}`)
  return sent
}

const BASE_URL = 'https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/center-followup'

function confirmUrl(citaId: string) { return `${BASE_URL}?action=patient_confirm&cita_id=${citaId}` }
function cancelUrl(citaId: string)  { return `${BASE_URL}?action=patient_cancel&cita_id=${citaId}` }

// ── 2a. RECORDATORIO 12H ───────────────────────────────────────────────────
async function runRecordatorios12h() {
  const now     = new Date()
  const inMin   = now.getHours() * 60 + now.getMinutes()
  const today   = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  const { data } = await sb.from('center_citas')
    .select('id,fecha_pref,hora,servicios,center_patients(nombre,email,telefono),centers(nombre,whatsapp,telefono,center_doctors(orden,medicos(nombre,apellido,titulo)))')
    .in('fecha_pref', [today, tomorrow])
    .is('email_reminder_at', null)
    .not('email_confirm_at', 'is', null)
    .eq('atendido', false)
    .neq('estado', 'cancelado')
    .not('hora', 'is', null)
    .limit(100)

  if (!data?.length) return 0
  let sent = 0
  for (const c of data) {
    if (!c.hora) continue
    const [h, m] = c.hora.split(':').map(Number)
    const citaDayMin = h * 60 + m
    const citaAbsMin = c.fecha_pref === today ? citaDayMin : citaDayMin + 1440
    const diffMin    = citaAbsMin - inMin
    if (diffMin < 690 || diffMin > 750) continue  // ventana 11.5h–12.5h

    const p      = c.center_patients as {nombre:string, email?:string}
    const center = c.centers as Record<string, unknown>
    if (!p?.email || !center?.nombre) continue

    await sendEmail('center_reminder', {
      to_email: p.email, patient_name: p.nombre, center_name: center.nombre as string,
      center_phone: (center.whatsapp||center.telefono||'') as string,
      doctor_name: extractDoctorName(center),
      fecha: fmtDate(c.fecha_pref), hora: c.hora, servicios: fmtServices(c.servicios),
      confirm_url: confirmUrl(c.id), cancel_url: cancelUrl(c.id),
    })
    await sb.from('center_citas').update({ email_reminder_at: new Date().toISOString(), followup_reminder_sent: true }).eq('id', c.id)
    sent++
  }
  console.log(`[center-followup] recordatorios 12h: ${sent}`)
  return sent
}

// ── 2b. RECORDATORIO 3H ───────────────────────────────────────────────────
async function runRecordatorios3h() {
  const now   = new Date()
  const today = now.toISOString().split('T')[0]
  const inMin = now.getHours()*60 + now.getMinutes()
  const { data } = await sb.from('center_citas')
    .select('id,fecha_pref,hora,servicios,center_patients(nombre,email,telefono),centers(nombre,whatsapp,telefono,center_doctors(orden,medicos(nombre,apellido,titulo)))')
    .eq('fecha_pref', today).is('email_reminder_3h_at', null).not('email_confirm_at', 'is', null).eq('atendido', false).neq('estado','cancelado')
    .not('hora','is',null).limit(100)

  if (!data?.length) return 0
  let sent = 0
  for (const c of data) {
    if (!c.hora) continue
    const [h,m] = c.hora.split(':').map(Number)
    const citaMin = h*60+m
    const diffMin = citaMin - inMin
    if (diffMin < 150 || diffMin > 210) continue  // ventana 2.5h–3.5h antes
    const p = c.center_patients as {nombre:string, email?:string}
    const center = c.centers as Record<string, unknown>
    if (!p?.email || !center?.nombre) continue
    await sendEmail('center_reminder', {
      to_email: p.email, patient_name: p.nombre, center_name: center.nombre as string,
      center_phone: (center.whatsapp||center.telefono||'') as string,
      doctor_name: extractDoctorName(center),
      fecha: fmtDate(today), hora: c.hora, servicios: fmtServices(c.servicios),
      confirm_url: confirmUrl(c.id), cancel_url: cancelUrl(c.id),
      es_3h: true,
    })
    await sb.from('center_citas').update({ email_reminder_3h_at: new Date().toISOString() }).eq('id', c.id)
    sent++
  }
  console.log(`[center-followup] recordatorios 3h: ${sent}`)
  return sent
}

// ── 3. NO-SHOW ── fecha pasada 1-3 días, no atendidos ──────────────────────
async function runNoShow() {
  const from = new Date(); from.setDate(from.getDate() - 3)
  const to   = new Date(); to.setDate(to.getDate() - 1)
  const { data } = await sb
    .from('center_citas')
    .select('*, center_patients(nombre, email, telefono), centers(nombre, whatsapp, telefono, slug)')
    .gte('fecha_pref', from.toISOString().split('T')[0])
    .lte('fecha_pref', to.toISOString().split('T')[0])
    .eq('atendido', false).is('email_noshow_at', null).neq('estado', 'cancelado')
    .limit(100)

  if (!data?.length) return 0
  let sent = 0
  for (const c of data) {
    const p = c.center_patients as {nombre:string, email?:string}
    const center = c.centers as {nombre:string, whatsapp?:string, telefono?:string, slug?:string}
    if (!p?.email || !center?.nombre) continue
    await sendEmail('center_noshow', {
      to_email: p.email, patient_name: p.nombre, center_name: center.nombre,
      center_phone: center.whatsapp||center.telefono||'',
      booking_url: center.slug?`https://doctor-center.citadoc.lat/${center.slug}`:null,
      servicios: fmtServices(c.servicios),
    })
    await sb.from('center_citas').update({ email_noshow_at: new Date().toISOString(), followup_noshow_sent: true }).eq('id', c.id)
    sent++
  }
  console.log(`[center-followup] no-show: ${sent}`)
  return sent
}

// ── 4. POST-VISITA ── recién atendidos ────────────────────────────────────
async function runPostVisita() {
  const since = new Date(); since.setDate(since.getDate() - 2)
  const { data } = await sb
    .from('center_citas')
    .select('*, center_patients(nombre, email), centers(nombre, slug)')
    .eq('atendido', true)
    .is('email_postvista_at', null)        // nunca enviado
    .gte('fecha_pref', since.toISOString().split('T')[0])
    .limit(100)

  if (!data?.length) return 0
  let sent = 0
  for (const c of data) {
    const p = c.center_patients as {nombre:string, email?:string}
    const center = c.centers as {nombre:string, slug?:string}
    if (!p?.email || !center?.nombre) continue
    await sendEmail('center_postvista', {
      to_email: p.email, patient_name: p.nombre, center_name: center.nombre,
      booking_url: center.slug?`https://doctor-center.citadoc.lat/${center.slug}`:null,
    })
    await sb.from('center_citas').update({ email_postvista_at: new Date().toISOString(), followup_postvista_sent: true }).eq('id', c.id)
    sent++
  }
  console.log(`[center-followup] post-visita: ${sent}`)
  return sent
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  // ── Patient action via GET (confirm / cancel) ─────────────────────────────
  if (req.method === 'GET') {
    const url  = new URL(req.url)
    const action = url.searchParams.get('action')
    const citaId = url.searchParams.get('cita_id') || url.searchParams.get('lead_id')

    if ((action === 'patient_confirm' || action === 'patient_cancel' || action === 'confirm') && citaId) {
      const { data: cita } = await sb.from('center_citas')
        .select('id,atendido,estado,fecha_pref,hora,center_patients(nombre,email),centers(nombre,slug,email,whatsapp,telefono)')
        .eq('id', citaId).single()
      if (!cita) return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:3rem;background:#f1f5f9"><h2>❌ No se encontró la cita</h2></body></html>', { headers: { 'Content-Type': 'text/html' } })

      const patient    = cita.center_patients as {nombre:string, email?:string}
      const center     = cita.centers        as {nombre:string, slug?:string, email?:string, whatsapp?:string, telefono?:string}
      const centerName = center?.nombre || 'el centro'
      const patName    = patient?.nombre || 'Paciente'
      const bookingUrl = center?.slug ? `https://doctor-center.citadoc.lat/${center.slug}` : null

      if (action === 'patient_confirm' || action === 'confirm') {
        await sb.from('center_citas').update({ patient_confirmed: true, patient_confirmed_at: new Date().toISOString() }).eq('id', citaId)
        // Notify admin
        if (center?.email) {
          await sendEmail('center_admin_lead', {
            to_email: center.email, center_name: centerName, patient_name: patName,
            lead_id: citaId, telefono: '', email: patient?.email||'',
            fecha: cita.fecha_pref||'', hora: cita.hora||'', servicios: '✓ Confirmó asistencia', total: '',
          })
        }
        return new Response(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmado</title></head>
<body style="margin:0;padding:1rem;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;max-width:380px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1)">
  <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.8rem">✅</div>
  <h2 style="margin:0 0 .5rem;color:#0f172a;font-size:1.2rem">¡Asistencia confirmada!</h2>
  <p style="color:#374151;font-size:.88rem;margin:0 0 1.25rem;line-height:1.6">Gracias, <strong>${patName}</strong>.<br>Te esperamos en <strong>${centerName}</strong>${cita.fecha_pref ? ` el ${cita.fecha_pref}` : ''}${cita.hora ? ` a las ${cita.hora}` : ''}.</p>
  <p style="color:#94a3b8;font-size:.75rem;margin:0">Podés cerrar esta ventana.</p>
</div></body></html>`, { headers: { 'Content-Type': 'text/html' } })
      }

      if (action === 'patient_cancel') {
        await sb.from('center_citas').update({ estado: 'cancelado', followup_confirm_sent: true }).eq('id', citaId)
        // Send reschedule email
        if (patient?.email && center?.nombre) {
          await sendEmail('center_noshow', {
            to_email: patient.email, patient_name: patName, center_name: centerName,
            center_phone: center.whatsapp||center.telefono||'', booking_url: bookingUrl,
          })
        }
        return new Response(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cancelado</title></head>
<body style="margin:0;padding:1rem;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;max-width:380px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1)">
  <div style="width:64px;height:64px;background:#fff7ed;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.8rem">📅</div>
  <h2 style="margin:0 0 .5rem;color:#0f172a;font-size:1.2rem">Turno cancelado</h2>
  <p style="color:#374151;font-size:.88rem;margin:0 0 1.25rem;line-height:1.6">Entendemos que los planes cambian, <strong>${patName}</strong>.<br>Te enviamos un email para que puedas reagendar cuando quieras.</p>
  ${bookingUrl ? `<a href="${bookingUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:.75rem 1.5rem;border-radius:10px;font-size:.88rem;font-weight:700;text-decoration:none;margin-bottom:.75rem">Reservar nuevo turno →</a><br>` : ''}
  <p style="color:#94a3b8;font-size:.75rem;margin:0">Podés cerrar esta ventana.</p>
</div></body></html>`, { headers: { 'Content-Type': 'text/html' } })
      }
    }
    return new Response('Not found', { status: 404 })
  }

  try {
    const [c, r12, r3] = await Promise.all([
      runConfirmaciones(),
      runRecordatorios12h(),
      runRecordatorios3h(),
    ])
    return new Response(JSON.stringify({ ok: true, confirm: c, reminder_12h: r12, reminder_3h: r3 }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch(e) {
    console.error('[center-followup] error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
