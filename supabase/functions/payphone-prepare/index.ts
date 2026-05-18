import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const PP_TOKEN = Deno.env.get('PAYPHONE_TOKEN')!
    const PP_STORE = Deno.env.get('PAYPHONE_STORE_ID')!

    const isWeb    = planType === 'pro_web'
    const amount   = isWeb ? 15000 : 1999
    const shortPlan = isWeb ? 'pw' : 'pr'
    const shortId   = (medicoId || '').replace(/-/g, '').slice(0, 12)
    const txId      = ('cd-' + shortPlan + '-' + shortId + '-' + Date.now().toString(36)).slice(0, 50)

    const base = 'https://citadoc.lat/citadoc-dashboard.html'
    const payload = {
      amount,
      amountWithoutTax: amount,
      currency:            'USD',
      clientTransactionId: txId,
      storeId:             PP_STORE,
      reference:           'CitaDoc ' + (isWeb ? 'PRO+WEB' : 'PRO') + ' | ' + medicoId,
      lang:                'es',
      email:               email || '',
      responseUrl:     base + '?pp_return=1&pp_plan=' + planType + '&pp_tx=' + encodeURIComponent(txId),
      cancellationUrl: base + '?pp_cancel=1'
    }

    const res = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    const data = JSON.parse(text).catch?.(() => ({})) || (() => { try { return JSON.parse(text) } catch { return {} } })()

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: text }), { status: 400, headers: cors })
    }

    const url = data.payWithCard || data.payWithPayPhone || data.paymentUrl
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: 'No URL', raw: text }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true, url, txId }), { headers: cors })

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors })
  }
})
