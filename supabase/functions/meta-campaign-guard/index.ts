import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const META_BASE    = 'https://graph.facebook.com/v19.0'
const SEND_EMAIL   = `${SUPABASE_URL}/functions/v1/send-email`
const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

// Thresholds
const MAX_COST_PER_MSG = 8      // USD
const MAX_DAYS_NO_MSG  = 2      // days
const MIN_CTR          = 0.005  // 0.5%

async function getMeta() {
  const { data } = await sb.from('platform_settings' as never).select('value').eq('key', 'meta_integration').single()
  if (!data) throw new Error('Meta not connected')
  const v = (data as any).value
  return { token: v.access_token as string, adAccount: v.ad_accounts?.[0]?.id as string }
}

async function metaGet(path: string, token: string, params = '') {
  const res = await fetch(`${META_BASE}${path}?access_token=${token}${params ? '&' + params : ''}`)
  return res.json()
}

async function pauseCampaign(campaignId: string, token: string) {
  await fetch(`${META_BASE}/${campaignId}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PAUSED' })
  })
}

async function notifyAdmin(reason: string, campaignName: string, metrics: Record<string, unknown>) {
  await fetch(SEND_EMAIL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SRV}` },
    body: JSON.stringify({
      type: 'docs',
      to_email: 'mateoalarconpons@gmail.com',
      html_body: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem">
          <div style="background:#0f172a;border-radius:16px;padding:2rem;color:#fff">
            <div style="font-size:.75rem;color:#f59e0b;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.8rem">⚠️ CitaDoc — Alerta de Campaña</div>
            <h2 style="margin:0 0 .5rem;font-size:1.2rem">${campaignName}</h2>
            <p style="color:rgba(255,255,255,.6);margin:0 0 1.5rem">${reason}</p>
            <div style="background:rgba(255,255,255,.06);border-radius:10px;padding:1rem">
              <div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-bottom:.5rem">MÉTRICAS DETECTADAS</div>
              ${Object.entries(metrics).map(([k,v]) => `<div style="font-size:.85rem;color:#e2e8f0;padding:.2rem 0">${k}: <strong>${v}</strong></div>`).join('')}
            </div>
            <a href="https://citadoc.lat/admin.html?key=citadoc-growth-2026" style="display:block;background:#f59e0b;color:#000;text-align:center;padding:1rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1.5rem">Ver en Admin →</a>
          </div>
        </div>`
    })
  }).catch(() => {})
}

Deno.serve(async (req) => {
  // Dos vías legítimas: admin.html (JWT real, verificarRendimiento()) y el
  // cron real meta-campaign-guard-72h (pg_cron, cada 3 días, Bearer
  // service_role) -- allowServiceRole solo cubre ese segundo caso, nunca
  // aceptado desde HTML/JS.
  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const meta = await getMeta()

    // Get active campaigns
    const campaigns = await metaGet(`/${meta.adAccount}/campaigns`, meta.token,
      'fields=id,name,status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]')

    const paused: string[] = []

    for (const c of (campaigns.data || [])) {
      // Get last 3 days insights
      const insights = await metaGet(`/${c.id}/insights`, meta.token,
        'fields=impressions,clicks,spend,actions,ctr&date_preset=last_3d&level=campaign')

      const d = insights.data?.[0]
      if (!d) continue

      const ctr       = parseFloat(d.ctr || '0')
      const spend     = parseFloat(d.spend || '0')
      const actions   = d.actions || []
      const msgs      = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')
      const msgCount  = msgs ? parseInt(msgs.value) : 0
      const costPerMsg = msgCount > 0 ? spend / msgCount : null

      let reason = ''
      const metrics: Record<string, string> = {
        'CTR (3 días)': `${(ctr * 100).toFixed(2)}%`,
        'Mensajes (3 días)': String(msgCount),
        'Gasto (3 días)': `$${spend.toFixed(2)}`,
        'Costo por mensaje': costPerMsg ? `$${costPerMsg.toFixed(2)}` : 'Sin mensajes',
      }

      if (costPerMsg !== null && costPerMsg > MAX_COST_PER_MSG) {
        reason = `Costo por mensaje demasiado alto: $${costPerMsg.toFixed(2)} (límite $${MAX_COST_PER_MSG})`
      } else if (msgCount === 0 && spend > 1) {
        reason = `Sin mensajes en ${MAX_DAYS_NO_MSG} días con $${spend.toFixed(2)} gastados`
      } else if (ctr < MIN_CTR && spend > 1) {
        reason = `CTR bajo: ${(ctr * 100).toFixed(2)}% (mínimo 0.5%)`
      }

      if (reason) {
        await pauseCampaign(c.id, meta.token)
        await notifyAdmin(reason, c.name, metrics)
        paused.push(c.name)
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: campaigns.data?.length || 0, paused }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('[meta-campaign-guard]', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
