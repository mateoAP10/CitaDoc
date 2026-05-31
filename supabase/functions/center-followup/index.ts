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

// ── 1. CONFIRMACIÓN ── leads sin confirmar de las últimas 2h con email ────────
async function runConfirmaciones() {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: leads } = await sb
    .from('center_leads')
    .select('*, centers(nombre, email, telefono, whatsapp, color_primary)')
    .eq('followup_confirm_sent', false)
    .not('email', 'is', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(50)

  if (!leads?.length) return 0
  let sent = 0
  for (const l of leads) {
    const center = l.centers as {nombre:string, email:string, telefono?:string, whatsapp?:string, color_primary?:string}
    if (!center?.nombre) continue
    await sendEmail('center_confirm', {
      to_email:      l.email,
      patient_name:  l.nombre,
      center_name:   center.nombre,
      center_phone:  center.whatsapp || center.telefono || '',
      fecha:         l.fecha_pref ? fmtDate(l.fecha_pref) : null,
      hora:          l.hora || null,
      servicios:     fmtServices(l.servicios),
      total:         l.total_est ? `$${l.total_est}` : null,
    })
    // Notify admin
    if (center.email) {
      await sendEmail('center_admin_lead', {
        to_email:     center.email,
        center_name:  center.nombre,
        patient_name: l.nombre,
        telefono:     l.telefono || '',
        email:        l.email,
        fecha:        l.fecha_pref ? fmtDate(l.fecha_pref) : 'Sin fecha',
        hora:         l.hora || 'Sin hora',
        servicios:    fmtServices(l.servicios),
        total:        l.total_est ? `$${l.total_est}` : '',
      })
    }
    await sb.from('center_leads').update({ followup_confirm_sent: true }).eq('id', l.id)
    sent++
  }
  console.log(`[center-followup] confirmaciones: ${sent}`)
  return sent
}

// ── 2. RECORDATORIO ── citas mañana, no recordadas aún ───────────────────────
async function runRecordatorios() {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tStr = tomorrow.toISOString().split('T')[0]
  const { data: leads } = await sb
    .from('center_leads')
    .select('*, centers(nombre, email, whatsapp, telefono)')
    .eq('fecha_pref', tStr)
    .eq('followup_reminder_sent', false)
    .eq('atendido', false)
    .not('email', 'is', null)
    .limit(100)

  if (!leads?.length) return 0
  let sent = 0
  for (const l of leads) {
    const center = l.centers as {nombre:string, whatsapp?:string, telefono?:string}
    if (!center?.nombre) continue
    await sendEmail('center_reminder', {
      to_email:     l.email,
      patient_name: l.nombre,
      center_name:  center.nombre,
      center_phone: center.whatsapp || center.telefono || '',
      fecha:        fmtDate(tStr),
      hora:         l.hora || null,
      servicios:    fmtServices(l.servicios),
    })
    await sb.from('center_leads').update({ followup_reminder_sent: true }).eq('id', l.id)
    sent++
  }
  console.log(`[center-followup] recordatorios: ${sent}`)
  return sent
}

// ── 3. NO-SHOW ── fecha pasada hace 1-3 días, no atendidos, no notificados ────
async function runNoShow() {
  const from = new Date(); from.setDate(from.getDate() - 3)
  const to   = new Date(); to.setDate(to.getDate() - 1)
  const { data: leads } = await sb
    .from('center_leads')
    .select('*, centers(nombre, whatsapp, telefono, slug)')
    .gte('fecha_pref', from.toISOString().split('T')[0])
    .lte('fecha_pref', to.toISOString().split('T')[0])
    .eq('atendido', false)
    .eq('followup_noshow_sent', false)
    .not('email', 'is', null)
    .limit(100)

  if (!leads?.length) return 0
  let sent = 0
  for (const l of leads) {
    const center = l.centers as {nombre:string, whatsapp?:string, telefono?:string, slug?:string}
    if (!center?.nombre) continue
    await sendEmail('center_noshow', {
      to_email:     l.email,
      patient_name: l.nombre,
      center_name:  center.nombre,
      center_phone: center.whatsapp || center.telefono || '',
      booking_url:  center.slug ? `https://doctor-center.citadoc.lat/${center.slug}` : null,
      servicios:    fmtServices(l.servicios),
    })
    await sb.from('center_leads').update({ followup_noshow_sent: true }).eq('id', l.id)
    sent++
  }
  console.log(`[center-followup] no-show: ${sent}`)
  return sent
}

// ── 4. POST-VISITA ── atendidos hoy/ayer sin followup ─────────────────────────
async function runPostVisita() {
  const since = new Date(); since.setDate(since.getDate() - 2)
  const { data: leads } = await sb
    .from('center_leads')
    .select('*, centers(nombre, slug)')
    .eq('atendido', true)
    .eq('followup_postvista_sent', false)
    .gte('fecha_pref', since.toISOString().split('T')[0])
    .not('email', 'is', null)
    .limit(100)

  if (!leads?.length) return 0
  let sent = 0
  for (const l of leads) {
    const center = l.centers as {nombre:string, slug?:string}
    if (!center?.nombre) continue
    await sendEmail('center_postvista', {
      to_email:     l.email,
      patient_name: l.nombre,
      center_name:  center.nombre,
      booking_url:  center.slug ? `https://doctor-center.citadoc.lat/${center.slug}` : null,
    })
    await sb.from('center_leads').update({ followup_postvista_sent: true }).eq('id', l.id)
    sent++
  }
  console.log(`[center-followup] post-visita: ${sent}`)
  return sent
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  // ── One-click confirmation via GET ────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const leadId = url.searchParams.get('lead_id')
    if (action === 'confirm' && leadId) {
      const { data: lead, error } = await sb.from('center_leads').select('id,nombre,atendido,email,center_id,centers(nombre,slug)').eq('id', leadId).single()
      if (error || !lead) return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>❌ No se encontró la reserva</h2></body></html>', { headers: { 'Content-Type': 'text/html' } })
      if (!lead.atendido) {
        await sb.from('center_leads').update({ atendido: true, followup_postvista_sent: false }).eq('id', leadId)
        // Trigger post-visita email to patient
        const center = lead.centers as {nombre:string, slug?:string}
        if (lead.email && center?.nombre) {
          await sendEmail('center_postvista', {
            to_email: lead.email, patient_name: lead.nombre||'',
            center_name: center.nombre,
            booking_url: center.slug ? `https://doctor-center.citadoc.lat/${center.slug}` : null,
          })
        }
      }
      const centerName = (lead.centers as {nombre:string})?.nombre || 'el centro'
      return new Response(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Asistencia confirmada</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;padding:1rem">
<div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;max-width:400px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1)">
  <div style="font-size:3rem;margin-bottom:1rem">✅</div>
  <h2 style="margin:0 0 .5rem;color:#0f172a;font-size:1.3rem">Asistencia confirmada</h2>
  <p style="color:#374151;font-size:.9rem;margin:0 0 1.5rem;line-height:1.6">${lead.nombre || 'El paciente'} fue marcado como atendido en <strong>${centerName}</strong>.<br>Se enviará el email de post-visita automáticamente.</p>
  <a href="javascript:window.close()" style="font-size:.82rem;color:#94a3b8;text-decoration:none">Cerrar ventana</a>
</div></body></html>`, { headers: { 'Content-Type': 'text/html' } })
    }
    return new Response('Not found', { status: 404 })
  }

  try {
    const [c, r, n, p] = await Promise.all([
      runConfirmaciones(),
      runRecordatorios(),
      runNoShow(),
      runPostVisita(),
    ])
    return new Response(JSON.stringify({ ok: true, confirm: c, reminder: r, noshow: n, postvista: p }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch(e) {
    console.error('[center-followup] error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
