import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Content-Type': 'application/json',
}

const ADMIN_TOKEN  = 'citadoc-growth-2026'
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') || ''
const FROM         = 'CitaDoc <hola@citadoc.lat>'
const BASE_URL     = 'https://citadoc.lat'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

// ── Email premium de invitación ───────────────────────────────────────────────

function tplInvite(d: {
  doctor_name: string
  specialty: string
  city: string
  magic_link: string
  demo_url: string | null
}): string {
  const firstName = (d.doctor_name || '').split(' ')[0] || 'Doctor'
  const hasDemo   = !!d.demo_url

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>

<tr><td style="background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid #1e293b;">
<table width="100%" cellpadding="0" cellspacing="0">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:44px 44px 36px;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
    <td style="background:rgba(14,157,140,.15);border:1px solid rgba(14,157,140,.3);border-radius:100px;padding:5px 16px;">
      <span style="color:#4dd9c8;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Tu perfil médico está listo</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 12px;color:#f8fafc;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-.3px;">${firstName}, creamos<br>tu sitio médico.</h1>
  <p style="margin:0;color:rgba(255,255,255,.45);font-size:14px;line-height:1.6;">Tu perfil profesional como <strong style="color:rgba(255,255,255,.7);">${d.specialty}</strong> en ${d.city} ya existe en CitaDoc. Solo falta que lo reclames.</p>
</td></tr>

<!-- Demo preview card -->
${hasDemo ? `<tr><td style="padding:0 32px 0;">
  <a href="${d.demo_url}" style="display:block;background:linear-gradient(135deg,#0e2a26,#0b3d35);border:1px solid rgba(14,157,140,.25);border-radius:14px;padding:20px 24px;text-decoration:none;margin:0 0 0;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.3);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Vista previa de tu sitio</p>
    <p style="margin:0 0 10px;color:#f8fafc;font-size:16px;font-weight:700;">${d.doctor_name}</p>
    <p style="margin:0;color:#4dd9c8;font-size:13px;font-weight:600;">Ver mi sitio médico →</p>
  </a>
</td></tr>` : ''}

<!-- Beneficios -->
<tr><td style="padding:28px 44px 8px;">
  <p style="margin:0 0 16px;color:rgba(255,255,255,.2);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Con tu cuenta activa podés</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${[
      ['📅', 'Recibir citas online', 'Tus pacientes agendan 24/7 desde tu link único'],
      ['📋', 'Historial clínico digital', 'Notas, recetas y seguimiento en un solo lugar'],
      ['🌐', 'Tu sitio médico propio', 'Personalizado con tu identidad y especialidad'],
    ].map(([icon, title, desc]) => `
    <tr><td style="padding:0 0 16px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px;font-size:20px;line-height:1.2;">${icon}</td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">${title}</p>
          <p style="margin:0;color:#475569;font-size:13px;">${desc}</p>
        </td>
      </tr></table>
    </td></tr>`).join('')}
  </table>
</td></tr>

<!-- CTA principal -->
<tr><td style="padding:8px 44px 44px;">
  <a href="${d.magic_link}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:18px;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-.1px;">
    Activar mi cuenta gratis →
  </a>
  <p style="margin:12px 0 0;text-align:center;color:#334155;font-size:12px;">Gratis para siempre · Sin tarjeta · Listo en 2 minutos</p>
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · La capa AI del médico moderno · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Validar token admin
  const token = req.headers.get('x-admin-token')
  if (token !== ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(SUPABASE_URL, SUPABASE_SVC, { auth: { autoRefreshToken: false, persistSession: false } })

  const body = await req.json().catch(() => ({}))
  const { email, doctor_name, specialty, city, demo_slug, lead_id } = body

  if (!email || !doctor_name) return json({ error: 'email y doctor_name son requeridos' }, 400)

  // 1. Generar magic link (invite) vía Supabase Auth Admin
  const redirectTo = demo_slug
    ? `${BASE_URL}/citadoc-registro.html?from=invite&demo=${demo_slug}`
    : `${BASE_URL}/citadoc-registro.html?from=invite`

  // Intentar invite, si ya existe usar magiclink
  let magic_link = redirectTo
  const { data: inviteData, error: inviteError } = await sb.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  if (inviteError) {
    // Usuario ya registrado — generar magic link para login directo
    const { data: mlData, error: mlError } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: 'https://citadoc.lat/citadoc-dashboard.html' },
    })
    if (mlError) {
      // Último fallback: link directo al dashboard
      magic_link = 'https://citadoc.lat/citadoc-dashboard.html'
    } else {
      magic_link = mlData.properties?.action_link || redirectTo
    }
  } else {
    magic_link = inviteData.properties?.action_link || redirectTo
  }

  // 2. Enviar email premium via Resend
  const demo_url = demo_slug ? `${BASE_URL}/demo.html?slug=${demo_slug}` : null
  const html = tplInvite({ doctor_name, specialty: specialty || 'Medicina', city: city || '', magic_link, demo_url })

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from:    FROM,
      to:      [email],
      subject: `${doctor_name.split(' ')[0]}, tu sitio médico está listo en CitaDoc`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('[invite] Resend error:', err)
    return json({ error: 'email send failed', detail: err }, 500)
  }

  // 3. Actualizar doctor_leads si hay lead_id
  if (lead_id) {
    await sb.from('doctor_leads').update({ status: 'invited' }).eq('id', lead_id)
  }

  return json({ ok: true, email, demo_url })
})
