import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPHONE_TOKEN = Deno.env.get('PAYPHONE_TOKEN') || ''

// ── Demo activation ──────────────────────────────────────────────────────────
// clientTransactionId format: "cd-demo-{slug}-{timestamp}"
async function activateDemoSite(slug: string, email: string | undefined, sb: ReturnType<typeof createClient>) {
  // 1. Load demo
  const { data: demo, error: dErr } = await sb
    .from('generated_demos')
    .select('*')
    .eq('slug', slug)
    .single()
  if (dErr || !demo) throw new Error('Demo not found: ' + slug)

  // 2. Idempotency: already paid
  if (demo.payment_status === 'paid') {
    console.log('[webhook-demo] Already paid, skipping:', slug)
    return { note: 'already_paid', slug }
  }

  // 3. Build medico data
  const nameParts = (demo.doctor_name || '').replace(/^(dra?\.?\s+)/i, '').trim().split(' ')
  const titulo   = /dra\./i.test(demo.doctor_name || '') ? 'Dra.' : 'Dr.'
  const nombre   = nameParts[0] || ''
  const apellido = nameParts.slice(1).join(' ') || ''
  const wc       = { ...(demo.web_config_jsonb || {}), selected_layout: demo.selected_layout || 'surgical-authority', web_status: 'active' }

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

  // 4. Upsert medico
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

  // 5. Update demo status
  await sb.from('generated_demos').update({
    payment_status: 'paid',
    status:         'active',
    medico_id:      medicoId,
    activated_at:   new Date().toISOString(),
  }).eq('slug', slug)

  console.log('[webhook-demo] Activated:', slug, '→ medico:', medicoId)
  return { ok: true, slug, medicoId, url: `https://${slug}.citadoc.lat` }
}

// Extract medico UUID from clientTransactionId or reference
// clientTransactionId format: "cd-pro_web-{uuid}-{timestamp}"
// reference format: "CitaDoc PRO+WEB | {uuid}"
function extractMedicoId(clientTransactionId: string, reference: string): { medicoId: string | null; plan: string } {
  // Try clientTransactionId first (most reliable)
  // Format: cd-(pro_web|pro)-{36-char-uuid}-{timestamp}
  const txMatch = clientTransactionId?.match(/^cd-(pro_web|pro)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-\d+$/i)
  if (txMatch) {
    return { plan: txMatch[1], medicoId: txMatch[2] }
  }

  // Try reference field: "CitaDoc PRO+WEB | {uuid}"
  const refMatch = reference?.match(/CitaDoc\s+(PRO\+WEB|PRO)\s*\|\s*([0-9a-f-]{36})/i)
  if (refMatch) {
    const plan = refMatch[1].toLowerCase().replace('+', '_') // 'pro_web' or 'pro'
    return { plan, medicoId: refMatch[2] }
  }

  // Legacy format fallback (old clientTransactionId)
  const legacyMatch = clientTransactionId?.match(/citadoc-(pro_web|pro)-([0-9a-f-]+)-\d+/i)
  if (legacyMatch) {
    return { plan: legacyMatch[1], medicoId: legacyMatch[2] }
  }

  return { medicoId: null, plan: 'pro' }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    const {
      clientTransactionId,
      transactionId,
      transactionStatus,
      amount,
      reference,
      email
    } = payload

    // Only process approved transactions
    if (transactionStatus !== 'Approved') {
      console.log('[webhook] Skipping non-approved status:', transactionStatus)
      return new Response(JSON.stringify({ ok: true, note: 'not-approved', status: transactionStatus }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ── VALIDATE transaction against PayPhone Confirm API ──
    // Prevents fake webhooks from activating plans for free
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
          console.warn('[webhook] Confirm API error:', confirmRes.status, '— proceeding with webhook data')
        }
      } catch(e) {
        console.warn('[webhook] Confirm API unreachable:', e, '— proceeding with webhook data')
      }
    }

    // ── MAINTENANCE PAYMENT $29 (cd-maint-*) — medicoId comes from reference ──
    if ((clientTransactionId || '').startsWith('cd-maint-')) {
      const uuidMatch = (reference || '').match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
      const medicoId  = uuidMatch ? uuidMatch[1] : null
      if (!medicoId) {
        console.error('[webhook-maint] No medicoId in reference:', reference)
        return new Response(JSON.stringify({ error: 'missing_medico_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      const nextDate = new Date(); nextDate.setMonth(nextDate.getMonth() + 1)
      await sb.from('medicos').update({
        plan_activo:       true,
        maint_paid_until:  nextDate.toISOString().split('T')[0],
        updated_at:        new Date().toISOString(),
      }).eq('id', medicoId)
      console.log('[webhook-maint] Maintenance paid for medico:', medicoId)
      return new Response(JSON.stringify({ ok: true, type: 'maintenance', medicoId }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── DEMO ACTIVATION (cd-demo-{slug}-{timestamp}) ──
    const demoMatch = (clientTransactionId || '').match(/^cd-demo-(.+)-\d+$/)
    if (demoMatch) {
      const slug = demoMatch[1]
      console.log('[webhook] Demo activation for slug:', slug)
      const result = await activateDemoSite(slug, email, sb)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── EXTRACT medico ID (existing flow) ──
    const { medicoId, plan } = extractMedicoId(clientTransactionId || '', reference || '')

    if (!medicoId) {
      console.error('[webhook] Could not extract medicoId from:', { clientTransactionId, reference })
      return new Response(JSON.stringify({ error: 'missing_medico_id', clientTransactionId, reference }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseServiceKey)

    // ── IDEMPOTENCY CHECK ──
    // If already on the correct plan and active, skip — prevents double-activation on retries
    const { data: medico } = await sb
      .from('medicos')
      .select('plan, plan_activo, web_status, web_config_draft, web_config')
      .eq('id', medicoId)
      .single()

    if (medico && medico.plan === plan && medico.plan_activo === true) {
      console.log('[webhook] Already active, skipping idempotent duplicate:', medicoId, plan)
      return new Response(JSON.stringify({ ok: true, note: 'already_active', medicoId, plan }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ── BUILD UPDATE ──
    const update: Record<string, unknown> = {
      plan,
      plan_activo: true,
      updated_at: new Date().toISOString()
    }

    if (plan === 'pro_web') {
      update.web_status = 'active'
      // Promote draft to published config if draft exists and not already published
      if (medico?.web_config_draft && !medico?.web_config) {
        update.web_config = medico.web_config_draft
        console.log('[webhook] Promoting web_config_draft to web_config for:', medicoId)
      }
    }

    const { error } = await sb
      .from('medicos')
      .update(update)
      .eq('id', medicoId)

    if (error) {
      console.error('[webhook] Supabase update error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('[webhook] Activated:', plan, medicoId, '— transactionId:', transactionId)
    return new Response(JSON.stringify({ ok: true, plan, medicoId }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[webhook] Unhandled error:', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
