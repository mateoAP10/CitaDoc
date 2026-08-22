import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-B2 -- meta-publish publicaba de verdad en el Instagram/Facebook
// real de CitaDoc sin ningun chequeo de auth propio (verify_jwt=true
// solo exige CUALQUIER usuario autenticado). Ademas aceptaba image_url+
// caption directos, saltando por completo growth_content_queue/
// scheduled_posts. Unico caller legitimo real: process-scheduled
// (server-to-server, ya manda Authorization: Bearer service_role
// correcto -- no necesita ningun cambio).
//
// Fix: requireAdmin(req, {allowServiceRole:true}) antes de tocar
// meta_config o la Graph API. Se mantiene la capacidad de admin/
// service_role de pasar image_url+caption directos -- una vez cerrado
// el endpoint a identidades autorizadas, eso ya no es una escalacion.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

const META_BASE = 'https://graph.facebook.com/v19.0'

// ── Instagram Graph API ──────────────────────────────────────────────────────

async function publishInstagram(
  igUserId: string,
  pageToken: string,
  imageUrl: string,
  caption: string
): Promise<{ postId: string }> {

  // Step 1: Create media container
  const containerRes = await fetch(`${META_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url:    imageUrl,
      caption:      caption,
      access_token: pageToken,
    }),
  })

  const containerData = await containerRes.json()
  if (!containerRes.ok || !containerData.id) {
    throw new Error(`IG container failed: ${JSON.stringify(containerData)}`)
  }

  // Step 2: Publish container
  const publishRes = await fetch(`${META_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id:  containerData.id,
      access_token: pageToken,
    }),
  })

  const publishData = await publishRes.json()
  if (!publishRes.ok || !publishData.id) {
    throw new Error(`IG publish failed: ${JSON.stringify(publishData)}`)
  }

  return { postId: publishData.id }
}

// ── Facebook Page post ───────────────────────────────────────────────────────

async function publishFacebook(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  caption: string
): Promise<{ postId: string }> {

  const res = await fetch(`${META_BASE}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:          imageUrl,
      message:      caption,
      access_token: pageToken,
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(`FB publish failed: ${JSON.stringify(data)}`)
  }

  return { postId: data.id }
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const {
      queue_item_id,  // ID del item en growth_content_queue
      asset_id,       // ID del asset en growth_assets
      image_url,      // URL de la imagen (override si no viene de asset)
      caption,        // Caption override (si no, usa el del queue item)
      platform = 'instagram', // 'instagram' | 'facebook' | 'both'
    } = body

    if (!queue_item_id && !image_url) {
      return json({ error: 'queue_item_id o image_url son requeridos' }, 400)
    }

    const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SVCKEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

    // Leer config de Meta
    const { data: config, error: configErr } = await sb
      .from('meta_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configErr || !config) {
      return json({ error: 'Meta config no encontrada. Configura page_token e ig_user_id.' }, 400)
    }

    // Resolver imagen y caption
    let finalImageUrl = image_url
    let finalCaption  = caption

    if (queue_item_id && (!finalImageUrl || !finalCaption)) {
      const { data: qItem } = await sb
        .from('growth_content_queue')
        .select('content_jsonb, image_url')
        .eq('id', queue_item_id)
        .single()

      if (qItem) {
        finalImageUrl = finalImageUrl || qItem.image_url
        const c       = qItem.content_jsonb || {}
        finalCaption  = finalCaption || c.caption || c.hook || ''
      }
    }

    if (asset_id && !finalImageUrl) {
      const { data: asset } = await sb
        .from('growth_assets')
        .select('image_url')
        .eq('id', asset_id)
        .single()
      if (asset) finalImageUrl = asset.image_url
    }

    if (!finalImageUrl) return json({ error: 'No se encontró imagen para publicar' }, 400)
    if (!finalCaption)  return json({ error: 'No se encontró caption para publicar' }, 400)

    // Publicar
    const results: Record<string, string> = {}

    if (platform === 'instagram' || platform === 'both') {
      if (!config.ig_user_id) return json({ error: 'ig_user_id no configurado' }, 400)
      const r = await publishInstagram(config.ig_user_id, config.page_token, finalImageUrl, finalCaption)
      results.instagram_post_id = r.postId
    }

    if (platform === 'facebook' || platform === 'both') {
      const r = await publishFacebook(config.page_id, config.page_token, finalImageUrl, finalCaption)
      results.facebook_post_id = r.postId
    }

    const metaPostId = results.instagram_post_id || results.facebook_post_id || ''

    // Log
    await sb.from('meta_publish_log').insert({
      queue_item_id: queue_item_id || null,
      asset_id:      asset_id || null,
      platform,
      status:        'published',
      meta_post_id:  metaPostId,
      published_at:  new Date().toISOString(),
    })

    // Marcar como publicado en el queue
    if (queue_item_id) {
      await sb.from('growth_content_queue').update({
        status:          'published',
        published_at:    new Date().toISOString(),
        publish_channel: platform,
      }).eq('id', queue_item_id)
    }

    // Incrementar uso del asset
    if (asset_id) {
      await sb.from('growth_assets')
        .update({ used_count: sb.rpc('increment', { row_id: asset_id }) })
        .eq('id', asset_id)
    }

    return json({ ok: true, platform, results, meta_post_id: metaPostId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('meta-publish error:', msg)

    // Log error
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await sb.from('meta_publish_log').insert({
        platform: 'instagram', status: 'error', error_message: msg,
      })
    } catch (_) { /* ignore */ }

    return json({ error: msg }, 500)
  }
})
