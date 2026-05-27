import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPHONE_TOKEN    = Deno.env.get('PAYPHONE_TOKEN') || ''
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY)

// ── Activation email ──────────────────────────────────────────────────────────
async function sendActivationEmail(opts: {
  email: string
  nombre: string
  titulo: string
  plan: string
  slug?: string | null
}) {
  if (!RESEND_API_KEY || !opts.email) return

  const isProweb     = opts.plan === 'pro_web'
  const dashboardUrl = 'https://citadoc.lat/citadoc-dashboard.html'
  const siteUrl      = isProweb && opts.slug ? `https://${opts.slug}.citadoc.lat` : null
  const planLabel    = isProweb ? 'PRO + WEB' : 'PRO'

  const stepsHtml = isProweb ? `
    <tr>
      <td style="padding-bottom:14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;vertical-align:top;">
            <div style="width:26px;height:26px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;line-height:26px;">
              <span style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;">01</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 2px;color:#e5e7eb;font-size:14px;font-weight:600;">Revisa tu sitio web</p>
            <p style="margin:0;color:#6b7280;font-size:13px;">Tu identidad médica premium ya está publicada</p>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;vertical-align:top;">
            <div style="width:26px;height:26px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;line-height:26px;">
              <span style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;">02</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 2px;color:#e5e7eb;font-size:14px;font-weight:600;">Configura tu disponibilidad</p>
            <p style="margin:0;color:#6b7280;font-size:13px;">Horarios, tipos de consulta, precios</p>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;vertical-align:top;">
            <div style="width:26px;height:26px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;line-height:26px;">
              <span style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;">03</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 2px;color:#e5e7eb;font-size:14px;font-weight:600;">Comparte tu enlace de citas</p>
            <p style="margin:0;color:#6b7280;font-size:13px;">Tus pacientes pueden agendar hoy mismo</p>
          </td>
        </tr></table>
      </td>
    </tr>` : `
    <tr>
      <td style="padding-bottom:14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;vertical-align:top;">
            <div style="width:26px;height:26px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;line-height:26px;">
              <span style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;">01</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 2px;color:#e5e7eb;font-size:14px;font-weight:600;">Configura tu disponibilidad</p>
            <p style="margin:0;color:#6b7280;font-size:13px;">Horarios, tipos de consulta, precios</p>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;vertical-align:top;">
            <div style="width:26px;height:26px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;line-height:26px;">
              <span style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:700;">02</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 2px;color:#e5e7eb;font-size:14px;font-weight:600;">Comparte tu enlace de citas</p>
            <p style="margin:0;color:#6b7280;font-size:13px;">Tus pacientes pueden agendar hoy mismo</p>
          </td>
        </tr></table>
      </td>
    </tr>`

  const siteCardHtml = siteUrl ? `
    <tr>
      <td style="padding-bottom:32px;">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 24px;">
          <p style="margin:0 0 6px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Tu sitio médico</p>
          <a href="${siteUrl}" style="color:#60a5fa;font-size:16px;font-weight:600;text-decoration:none;">${siteUrl}</a>
        </div>
      </td>
    </tr>` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CitaDoc — Tu práctica ya evolucionó</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111111;border-radius:24px;overflow:hidden;border:1px solid #1e1e1e;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:48px 40px 40px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:7px 16px;">
              <span style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">CitaDoc ${planLabel}</span>
            </td></tr>
          </table>
          <h1 style="margin:0 0 14px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-0.5px;">
            Tu práctica médica<br>acaba de evolucionar.
          </h1>
          <p style="margin:0;color:rgba(255,255,255,0.4);font-size:14px;line-height:1.6;">
            Infraestructura de nivel premium — ahora activa.
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:28px;">
                <p style="margin:0 0 16px;color:#9ca3af;font-size:15px;line-height:1.7;">
                  ${opts.titulo} <strong style="color:#ffffff;">${opts.nombre}</strong>,
                </p>
                <p style="margin:0;color:#9ca3af;font-size:15px;line-height:1.7;">
                  Tu plan <strong style="color:#ffffff;">CitaDoc ${planLabel}</strong> está activo. Tienes acceso completo a tu dashboard, agendamiento inteligente${isProweb ? ' y tu sitio web médico personalizado' : ''}.
                </p>
              </td>
            </tr>
            ${siteCardHtml}
            <tr>
              <td style="padding-bottom:8px;">
                <p style="margin:0 0 16px;color:rgba(255,255,255,0.3);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Próximos pasos</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${stepsHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:32px 40px 40px;">
          <a href="${dashboardUrl}" style="display:block;background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);color:#ffffff;text-align:center;padding:16px 32px;border-radius:14px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
            Abrir mi panel &rarr;
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px 28px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;color:#3a3a3a;font-size:12px;line-height:1.7;">
            CitaDoc &mdash; La capa AI del médico moderno.<br>
            Preguntas: <a href="mailto:hola@citadoc.lat" style="color:#4b5563;text-decoration:none;">hola@citadoc.lat</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'CitaDoc <hola@citadoc.lat>',
        to:      [opts.email],
        subject: `${opts.titulo} ${opts.nombre}, tu práctica médica ya evolucionó`,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('[email] Resend error:', res.status, err)
    } else {
      console.log('[email] Activation email sent to:', opts.email)
    }
  } catch (e) {
    console.warn('[email] Resend unreachable:', e)
  }
}

// ── Demo activation ───────────────────────────────────────────────────────────
async function activateDemoSite(slug: string, email: string | undefined) {
  const { data: demo, error: dErr } = await sb
    .from('generated_demos')
    .select('*')
    .eq('slug', slug)
    .single()
  if (dErr || !demo) throw new Error('Demo not found: ' + slug)

  if (demo.payment_status === 'paid') {
    console.log('[webhook-demo] Already paid, skipping:', slug)
    return { note: 'already_paid', slug }
  }

  const nameParts = (demo.doctor_name || '').replace(/^(dra?\.?\s+)/i, '').trim().split(' ')
  const titulo    = /dra\./i.test(demo.doctor_name || '') ? 'Dra.' : 'Dr.'
  const nombre    = nameParts[0] || ''
  const apellido  = nameParts.slice(1).join(' ') || ''
  const wc        = { ...(demo.web_config_jsonb || {}), selected_layout: demo.selected_layout || 'surgical-authority', web_status: 'active' }

  const medicoData = {
    slug, titulo, nombre, apellido,
    especialidades: [demo.specialty],
    ciudad:         demo.city || null,
    foto_url:       demo.photo_url || null,
    logo_url:       demo.logo_url || null,
    email:          email || null,
    web_config:     wc,
    web_status:     'active',
    plan:           'pro_web',
    plan_activo:    true,
    activo:         true,
  }

  let medicoId = demo.medico_id
  if (!medicoId) {
    const existing = await sb.from('medicos').select('id').eq('slug', slug).maybeSingle()
    if (existing.data) {
      await sb.from('medicos').update(medicoData).eq('slug', slug)
      medicoId = existing.data.id
    } else {
      const ins = await sb.from('medicos').insert(medicoData).select('id').single()
      if (ins.error) throw ins.error
      medicoId = ins.data.id
    }
  } else {
    await sb.from('medicos').update({ web_status: 'active', plan: 'pro_web', plan_activo: true }).eq('id', medicoId)
  }

  await sb.from('generated_demos').update({
    payment_status: 'paid',
    status:         'active',
    medico_id:      medicoId,
    activated_at:   new Date().toISOString(),
  }).eq('slug', slug)

  // Send activation email (fire-and-forget)
  const resolvedEmail = email || demo.email
  if (resolvedEmail) {
    sendActivationEmail({ email: resolvedEmail, nombre, titulo, plan: 'pro_web', slug })
  }

  console.log('[webhook-demo] Activated:', slug, '→ medico:', medicoId)
  return { ok: true, slug, medicoId, url: `https://${slug}.citadoc.lat` }
}

// ── Extract medico ID from transaction ───────────────────────────────────────
function extractMedicoId(clientTransactionId: string, reference: string): { medicoId: string | null; plan: string } {
  const txMatch = clientTransactionId?.match(/^cd-(pro_web|pro)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-\d+$/i)
  if (txMatch) return { plan: txMatch[1], medicoId: txMatch[2] }

  const refMatch = reference?.match(/CitaDoc\s+(PRO\+WEB|PRO)\s*\|\s*([0-9a-f-]{36})/i)
  if (refMatch) return { plan: refMatch[1].toLowerCase().replace('+', '_'), medicoId: refMatch[2] }

  const legacyMatch = clientTransactionId?.match(/citadoc-(pro_web|pro)-([0-9a-f-]+)-\d+/i)
  if (legacyMatch) return { plan: legacyMatch[1], medicoId: legacyMatch[2] }

  return { medicoId: null, plan: 'pro' }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    const { clientTransactionId, transactionId, transactionStatus, reference, email } = payload

    if (transactionStatus !== 'Approved') {
      console.log('[webhook] Skipping non-approved status:', transactionStatus)
      return new Response(JSON.stringify({ ok: true, note: 'not-approved', status: transactionStatus }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ── Validate against PayPhone Confirm API ──
    if (PAYPHONE_TOKEN && clientTransactionId) {
      try {
        const confirmRes = await fetch(
          `https://pay.payphonetodoesposible.com/api/button/V2/Confirm?clientTransactionId=${encodeURIComponent(clientTransactionId)}`,
          { headers: { 'Authorization': `Bearer ${PAYPHONE_TOKEN}` } }
        )
        if (confirmRes.ok) {
          const confirmData = await confirmRes.json()
          if (confirmData.transactionStatus !== 'Approved') {
            console.warn('[webhook] Confirm API says not approved:', confirmData.transactionStatus)
            return new Response(JSON.stringify({ ok: true, note: 'confirm-not-approved' }), {
              headers: { 'Content-Type': 'application/json' }
            })
          }
        } else {
          console.warn('[webhook] Confirm API error:', confirmRes.status, '— proceeding')
        }
      } catch(e) {
        console.warn('[webhook] Confirm API unreachable:', e, '— proceeding')
      }
    }

    // ── Maintenance payment (cd-maint-*) ──
    if ((clientTransactionId || '').startsWith('cd-maint-')) {
      const uuidMatch = (reference || '').match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
      const medicoId  = uuidMatch ? uuidMatch[1] : null
      if (!medicoId) {
        console.error('[webhook-maint] No medicoId in reference:', reference)
        return new Response(JSON.stringify({ error: 'missing_medico_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      const nextDate = new Date()
      nextDate.setMonth(nextDate.getMonth() + 1)
      await sb.from('medicos').update({
        plan_activo:      true,
        maint_paid_until: nextDate.toISOString().split('T')[0],
        updated_at:       new Date().toISOString(),
      }).eq('id', medicoId)
      console.log('[webhook-maint] Maintenance paid for medico:', medicoId)
      return new Response(JSON.stringify({ ok: true, type: 'maintenance', medicoId }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── Demo activation (cd-demo-{slug}-{timestamp}) ──
    const demoMatch = (clientTransactionId || '').match(/^cd-demo-(.+)-\d+$/)
    if (demoMatch) {
      const slug = demoMatch[1]
      console.log('[webhook] Demo activation for slug:', slug)
      const result = await activateDemoSite(slug, email)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── PRO / PRO+WEB activation ──
    const { medicoId, plan } = extractMedicoId(clientTransactionId || '', reference || '')

    if (!medicoId) {
      console.error('[webhook] Could not extract medicoId from:', { clientTransactionId, reference })
      return new Response(JSON.stringify({ error: 'missing_medico_id', clientTransactionId, reference }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Load medico (idempotency + data for email)
    const { data: medico } = await sb
      .from('medicos')
      .select('plan, plan_activo, web_status, web_config_draft, web_config, email, nombre, titulo, slug')
      .eq('id', medicoId)
      .single()

    if (medico && medico.plan === plan && medico.plan_activo === true) {
      console.log('[webhook] Already active, skipping idempotent duplicate:', medicoId, plan)
      return new Response(JSON.stringify({ ok: true, note: 'already_active', medicoId, plan }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const update: Record<string, unknown> = {
      plan,
      plan_activo: true,
      updated_at:  new Date().toISOString()
    }

    if (plan === 'pro_web') {
      update.web_status = 'active'
    }

    const { error } = await sb.from('medicos').update(update).eq('id', medicoId)

    if (error) {
      console.error('[webhook] Supabase update error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    // ── PRO+WEB: activate generated_demos snapshot ───────────────────────────
    if (plan === 'pro_web' && medico?.slug) {
      try {
        const { data: demo, error: demoErr } = await sb
          .from('generated_demos')
          .select('id, medico_id, activated_at')
          .eq('slug', medico.slug)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (demo && !demoErr) {
          const demoUpd: Record<string, unknown> = {
            status:         'active',
            payment_status: 'paid',
          }
          // Link medico_id if missing
          if (!demo.medico_id) demoUpd.medico_id = medicoId
          // Activate only if not already live (idempotent)
          if (!demo.activated_at) demoUpd.activated_at = new Date().toISOString()

          await sb.from('generated_demos').update(demoUpd).eq('id', demo.id)
          console.log('[webhook] generated_demos activated for slug:', medico.slug, '| medico_id linked:', !demo.medico_id)
        } else {
          console.log('[webhook] No generated_demos found for slug:', medico.slug, '— skipping web activation')
        }
      } catch (webErr) {
        // Never block payment confirmation for this
        console.warn('[webhook] generated_demos activation error (non-fatal):', webErr)
      }
    }

    // Send activation email — fallback to auth user email if medico.email is null
    let emailAddr = email || medico?.email || null
    if (!emailAddr) {
      try {
        const { data: authData } = await sb.auth.admin.getUserById(medicoId)
        emailAddr = authData?.user?.email || null
      } catch (_) { /* ignore */ }
    }
    if (emailAddr && medico) {
      sendActivationEmail({
        email:  emailAddr,
        nombre: medico.nombre || '',
        titulo: medico.titulo || 'Dr.',
        plan,
        slug:   medico.slug || null,
      })
      console.log('[webhook] Activation email sent to:', emailAddr, 'plan:', plan)
    } else {
      console.warn('[webhook] No email found for medico:', medicoId)
    }

    console.log('[webhook] Activated:', plan, medicoId, '— transactionId:', transactionId)
    return new Response(JSON.stringify({ ok: true, plan, medicoId }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[webhook] Unhandled error:', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
