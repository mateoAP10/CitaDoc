import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_TOKEN  = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'
const META_BASE    = 'https://graph.facebook.com/v19.0'
const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-admin-token',
  'Content-Type': 'application/json',
}

async function getMeta() {
  const { data } = await sb.from('platform_settings' as never).select('value').eq('key', 'meta_integration').single()
  if (!data) throw new Error('Meta not connected')
  const v = (data as any).value
  return {
    token:      v.access_token as string,
    adAccount:  (v.ad_accounts?.[0]?.id || '') as string,
    pageId:     (v.pages?.[0]?.id || '') as string,
    pageToken:  (v.pages?.[0]?.access_token || v.access_token) as string,
  }
}

async function metaPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`${META_BASE}${path}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function metaGet(path: string, token: string, params = '') {
  const res = await fetch(`${META_BASE}${path}?access_token=${token}${params ? '&' + params : ''}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.headers.get('x-admin-token') !== ADMIN_TOKEN)
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

  const url    = new URL(req.url)
  const action = url.searchParams.get('action')
  const body   = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

  try {
    const meta = await getMeta()

    // ── List campaigns ─────────────────────────────────────────────────────
    if (action === 'list') {
      const data = await metaGet(`/${meta.adAccount}/campaigns`, meta.token,
        'fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&limit=20')
      return new Response(JSON.stringify({ ok: true, campaigns: data.data || [] }), { headers: CORS })
    }

    // ── List IG media ───────────────────────────────────────────────────────
    if (action === 'ig-media') {
      // Get IG account connected to page
      const igRes = await metaGet(`/${meta.pageId}`, meta.pageToken, 'fields=instagram_business_account')
      const igId  = igRes.instagram_business_account?.id
      if (!igId) return new Response(JSON.stringify({ ok: true, media: [], note: 'No Instagram account connected to page' }), { headers: CORS })
      const media = await metaGet(`/${igId}/media`, meta.pageToken,
        'fields=id,media_type,thumbnail_url,media_url,permalink,caption,timestamp&limit=10')
      return new Response(JSON.stringify({ ok: true, media: media.data || [], ig_id: igId }), { headers: CORS })
    }

    // ── Create full campaign ────────────────────────────────────────────────
    if (action === 'create') {
      const { name, daily_budget_usd, video_url, headline, description, cta_url, ig_post_id } = body

      // 1. Campaign
      const campaign = await metaPost(`/${meta.adAccount}/campaigns`, meta.token, {
        name:      name || 'CitaDoc — Adquisición Médicos Ecuador',
        objective: 'OUTCOME_TRAFFIC',
        status:    'PAUSED',
        special_ad_categories: [],
      })
      if (campaign.error) return new Response(JSON.stringify({ ok: false, step: 'campaign', error: campaign.error }), { headers: CORS })

      // 2. Ad Set — Ecuador, $6.50/day (~$200/month)
      const dailyBudgetCents = Math.round((daily_budget_usd || 6.5) * 100)
      const adset = await metaPost(`/${meta.adAccount}/adsets`, meta.token, {
        name:          'Ecuador · Médicos',
        campaign_id:   campaign.id,
        daily_budget:  dailyBudgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: {
          geo_locations: { countries: ['EC'] },
          age_min: 25,
          age_max: 55,
          flexible_spec: [{ interests: [{ id: '6003409350626', name: 'Medicine' }] }],
        },
        status: 'PAUSED',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      })
      if (adset.error) return new Response(JSON.stringify({ ok: false, step: 'adset', error: adset.error }), { headers: CORS })

      // 3. Creative
      let creative: Record<string, unknown>
      if (ig_post_id) {
        // Use existing IG post
        creative = await metaPost(`/${meta.adAccount}/adcreatives`, meta.token, {
          name: 'Creative — IG Post',
          object_story_id: `${meta.pageId}_${ig_post_id}`,
        })
      } else {
        // Link ad with image
        creative = await metaPost(`/${meta.adAccount}/adcreatives`, meta.token, {
          name: 'Creative — CitaDoc',
          object_story_spec: {
            page_id: meta.pageId,
            link_data: {
              link:        cta_url || 'https://citadoc.lat/citadoc-registro.html',
              message:     description || '¿Eres médico? Gestiona tus citas, historias clínicas y presencia digital desde CitaDoc. Gratis para comenzar.',
              name:        headline || 'CitaDoc — La plataforma del médico moderno',
              call_to_action: { type: 'SIGN_UP', value: { link: cta_url || 'https://citadoc.lat/citadoc-registro.html' } },
            },
          },
        })
      }
      if ((creative as any).error) return new Response(JSON.stringify({ ok: false, step: 'creative', error: (creative as any).error }), { headers: CORS })

      // 4. Ad
      const ad = await metaPost(`/${meta.adAccount}/ads`, meta.token, {
        name:        'Ad — CitaDoc Ecuador',
        adset_id:    adset.id,
        creative:    { creative_id: (creative as any).id },
        status:      'PAUSED',
      })

      return new Response(JSON.stringify({
        ok:          true,
        campaign_id: campaign.id,
        adset_id:    adset.id,
        creative_id: (creative as any).id,
        ad_id:       ad.id,
        manager_url: `https://www.facebook.com/adsmanager/manage/campaigns?act=${meta.adAccount.replace('act_', '')}`,
      }), { headers: CORS })
    }

    // ── Toggle campaign status ──────────────────────────────────────────────
    if (action === 'toggle') {
      const { campaign_id, status } = body
      const r = await metaPost(`/${campaign_id}`, meta.token, { status })
      return new Response(JSON.stringify({ ok: !r.error, result: r }), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: CORS })

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { headers: CORS })
  }
})
