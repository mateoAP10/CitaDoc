import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPHONE_TOKEN = Deno.env.get('PAYPHONE_TOKEN') || ''

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

    // ── EXTRACT medico ID ──
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
