import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3 -- funcion exclusivamente batch, sin caso de uso publico. Sin auth
// (verify_jwt=true = "cualquier usuario autenticado", sin chequeo propio)
// procesaba hasta 10 scheduled_posts vencidos y llamaba a meta-publish
// (ya protegida) por cada uno. Sin cron activo hoy -- no se resucita en
// este bloque, queda listo para cuando exista un caller real. Mismo
// patron que showcase-batch (A2.8).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status)
  }

  const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVCKEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

  // Posts que ya es hora de publicar
  const { data: due } = await sb
    .from('scheduled_posts')
    .select(`
      id, platform, queue_item_id, asset_id,
      growth_content_queue ( content_jsonb, image_url )
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .is('notified_at', null)
    .limit(10)

  if (!due || due.length === 0) {
    return json({ due: 0, message: 'No hay posts vencidos' })
  }

  const notified: string[] = []

  for (const post of due) {
    // Verificar si Meta Publisher está configurado
    const { data: metaConfig } = await sb
      .from('meta_config')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    if (metaConfig) {
      // Meta API disponible — publicar automáticamente
      try {
        const publishRes = await fetch(
          `${SUPABASE_URL}/functions/v1/meta-publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${SUPABASE_SVCKEY}`,
            },
            body: JSON.stringify({
              queue_item_id: post.queue_item_id,
              asset_id:      post.asset_id,
              platform:      post.platform,
            }),
          }
        )

        if (publishRes.ok) {
          const result = await publishRes.json()
          await sb.from('scheduled_posts').update({
            status:       'published',
            published_at: new Date().toISOString(),
            notified_at:  new Date().toISOString(),
            meta_post_id: result.meta_post_id || null,
          }).eq('id', post.id)

          notified.push(post.id)
          continue
        }
      } catch (_) { /* fallback to manual */ }
    }

    // Sin Meta API — marcar como "due" para publicación manual
    await sb.from('scheduled_posts').update({
      status:      'due',
      notified_at: new Date().toISOString(),
    }).eq('id', post.id)

    notified.push(post.id)
  }

  return json({
    processed: notified.length,
    notified,
    timestamp: new Date().toISOString(),
  })
})
