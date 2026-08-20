import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Content-Type': 'application/json',
}

const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'
const RESEND_KEY  = Deno.env.get('RESEND_API_KEY') || ''
const FROM        = 'CitaDoc <hola@citadoc.lat>'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function splitName(full: string): { nombre: string; apellido: string } {
  const clean = full.replace(/^(dr\.?|dra\.?)\s*/i, '').trim()
  const parts  = clean.split(/\s+/)
  return {
    nombre:   parts[0] || clean,
    apellido: parts.slice(1).join(' ') || '',
  }
}

function tplSetPassword(d: { firstName: string; setup_link: string }): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

<tr><td style="padding-bottom:20px;text-align:center">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span>
</td></tr>

<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#052a27,#0a3d35);padding:40px 40px 36px;text-align:center">
  <div style="width:52px;height:52px;background:rgba(255,255,255,.1);border-radius:50%;margin:0 auto 20px;line-height:52px;font-size:22px;text-align:center">🔑</div>
  <p style="margin:0 0 10px;color:rgba(255,255,255,.5);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tu cuenta está lista</p>
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3">${d.firstName}, ya sos parte<br>de CitaDoc.</h1>
</td></tr>

<tr><td style="padding:36px 40px 12px;text-align:center">
  <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7">Tu perfil médico está creado.<br>Solo falta que configures tu contraseña para entrar.</p>

  <table cellpadding="0" cellspacing="0" style="margin:0 auto">
    <tr><td>
      <a href="${d.setup_link}" style="display:inline-block;background:linear-gradient(135deg,#052a27,#0a3d35);color:#fff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:16px;font-weight:700">
        Configurar mi contraseña →
      </a>
    </td></tr>
  </table>

  <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">El link expira en 24 horas.</p>
</td></tr>

<tr><td style="padding:24px 40px 28px;text-align:center;border-top:1px solid #f1f5f9">
  <p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8;text-decoration:none">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr>
</table></td></tr></table>
</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const token = req.headers.get('x-admin-token')
  if (token !== ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const body = await req.json().catch(() => ({}))
  const { email, doctor_name, specialty, city, lead_id } = body

  if (!email || !doctor_name) return json({ error: 'email y doctor_name son requeridos' }, 400)

  const { nombre, apellido } = splitName(doctor_name)
  const firstName = nombre

  // ── 1. Crear / recuperar usuario en Supabase Auth ─────────────────────────
  let setup_link = 'https://citadoc.lat/citadoc-dashboard.html'
  const redirectTo = 'https://citadoc.lat/citadoc-dashboard.html'

  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  if (linkError) {
    // Ya existe — generar recovery link para que setee nueva contraseña
    const { data: recData } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    if (recData?.properties?.action_link) setup_link = recData.properties.action_link
  } else {
    setup_link = linkData?.properties?.action_link || redirectTo
  }

  // ── 2. Crear registro en medicos si no existe ─────────────────────────────
  const { data: existing } = await sb
    .from('medicos')
    .select('id')
    .eq('email', email)
    .limit(1)

  if (!existing || existing.length === 0) {
    const userId = linkData?.user?.id

    const baseSlug = `dr-${slugify(nombre)}${apellido ? '-' + slugify(apellido.split(' ')[0]) : ''}`
    const { data: slugCheck } = await sb.from('medicos').select('slug').like('slug', `${baseSlug}%`)
    const slug = slugCheck && slugCheck.length > 0
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`
      : baseSlug

    await sb.from('medicos').insert({
      ...(userId ? { id: userId } : {}),
      email,
      nombre,
      apellido,
      titulo:              'Dr.',
      especialidades:      specialty ? [specialty] : [],
      ciudad:              city || '',
      slug,
      activo:              true,
      plan:                'free',
      subscription_status: 'trialing',
      trial_ends_at:       new Date(Date.now() + 30 * 86400000).toISOString(),
    })
  }

  // ── 3. Enviar email vía Resend ─────────────────────────────────────────────
  const html = tplSetPassword({ firstName, setup_link })

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from:    FROM,
      to:      [email],
      subject: `${firstName}, configura tu contraseña CitaDoc`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('[invite] Resend error:', err)
    return json({ error: 'email send failed', detail: err }, 500)
  }

  // ── 4. Marcar lead como invitado ──────────────────────────────────────────
  if (lead_id) {
    await sb.from('doctor_leads').update({
      status:       'invited',
      contacted_at: new Date().toISOString(),
    }).eq('id', lead_id)
  }

  return json({ ok: true, email })
})
