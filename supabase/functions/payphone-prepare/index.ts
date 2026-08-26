import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { checkRateLimit, getClientIp } from '../_shared/rate-limit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { planType, medicoId, email } = await req.json()

    const rl = await checkRateLimit('payphone_prepare', medicoId || null, getClientIp(req))
    if (!rl.allowed) {
      return new Response(JSON.stringify({ ok: false, error: rl.reason }), { status: 429, headers: cors })
    }

    const PP_TOKEN = Deno.env.get('PAYPHONE_TOKEN') ?? ''
    const PP_STORE = Deno.env.get('PAYPHONE_STORE_ID') ?? ''

    if (!PP_TOKEN || !PP_STORE) {
      return new Response(JSON.stringify({ ok: false, error: 'PayPhone secrets not configured', tokenLen: PP_TOKEN.length, storeLen: PP_STORE.length }), { status: 500, headers: cors })
    }
    // Debug: verify secrets match expected values (safe — only prefix/suffix exposed)
    const tokenHint = PP_TOKEN.slice(0, 4) + '...' + PP_TOKEN.slice(-4)
    const storeHint = PP_STORE.slice(0, 8)

    const isWeb     = planType === 'pro_web'
    // $9.99/mes es el precio oficial de Pro y Mantenimiento (mismo precio,
    // no dos planes distintos) -- 1999 era un bug de implementacion, no
    // una decision de pricing. Ver citadoc-pay.html y citadoc-dashboard.html
    // (box de Mantenimiento), mismo fix aplicado ahi.
    const amount    = isWeb ? 15000 : 999
    const shortPlan = isWeb ? 'pw' : 'pr'
    const shortId   = (medicoId ?? '').replace(/-/g, '').slice(0, 12)
    const txId      = ('cd-' + shortPlan + '-' + shortId + '-' + Date.now().toString(36)).slice(0, 50)
    const base      = 'https://citadoc.lat/citadoc-dashboard.html'

    const payload: Record<string, unknown> = {
      amount,
      amountWithTax:    0,
      amountWithoutTax: amount,
      tax:              0,
      service:          0,
      tip:              0,
      currency:            'USD',
      clientTransactionId: txId,
      storeId:             PP_STORE,
      reference:           ('CitaDoc ' + (isWeb ? 'PRO+WEB' : 'PRO') + ' | ' + (medicoId ?? '')).slice(0, 100),
      lang:                'es',
      documentId:          '',
      email:               email ?? '',
      responseUrl:     base + '?pp_return=1&pp_plan=' + planType + '&pp_tx=' + encodeURIComponent(txId),
      cancellationUrl: base + '?pp_cancel=1'
    }

    const res = await fetch('https://pay.payphonetodoesposible.com/api/payment-button-box/prepare', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PP_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(text) } catch { /* PayPhone returned non-JSON */ }

    if (!res.ok) {
      const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
      return new Response(JSON.stringify({ ok: false, error: snippet, status: res.status, tokenHint, storeHint }), { status: 400, headers: cors })
    }

    const url = (data.payWithCard ?? data.payWithPayPhone ?? data.paymentUrl ?? data.url ?? data.redirectUrl) as string | undefined
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: 'No payment URL in response', raw: text.slice(0, 400), keys: Object.keys(data) }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true, url, txId }), { headers: cors })

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors })
  }
})
