import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERIFY_TOKEN    = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'citadoc_webhook_2026'
const PAGE_TOKEN      = Deno.env.get('META_PAGE_TOKEN') || ''
const META_BASE       = 'https://graph.facebook.com/v19.0'
const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

const AUTO_REPLY = `¡Hola! 👋 Gracias por escribirnos a CitaDoc.

Somos la plataforma digital para médicos modernos — gestiona tus citas, historias clínicas y presencia digital desde un solo lugar.

🎁 Tu primer mes Pro es completamente gratis.

Regístrate aquí: https://citadoc.lat/citadoc-registro.html

¿Tienes alguna pregunta? Estamos aquí para ayudarte.`

async function sendIGReply(recipientId: string, text: string, pageToken: string) {
  if (!pageToken) return
  await fetch(`${META_BASE}/me/messages?access_token=${pageToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message:   { text },
    }),
  }).catch(() => {})
}

async function getIGUserInfo(userId: string, pageToken: string) {
  try {
    const r = await fetch(`${META_BASE}/${userId}?fields=name,username&access_token=${pageToken}`)
    return await r.json()
  } catch { return {} }
}

Deno.serve(async (req) => {
  // ── Webhook verification (GET) ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const url    = new URL(req.url)
    const mode   = url.searchParams.get('hub.mode')
    const token  = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // ── Receive webhook events (POST) ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()

      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id
          const message  = event.message?.text
          if (!senderId || !message || event.message?.is_echo) continue

          // Get user info
          const { data: pageData } = await sb
            .from('platform_settings' as never)
            .select('value')
            .eq('key', 'meta_integration')
            .single()
          const pageToken = (pageData as any)?.value?.pages?.[0]?.access_token || PAGE_TOKEN

          const userInfo = await getIGUserInfo(senderId, pageToken)

          // Upsert lead — don't duplicate if same instagram_id
          const { data: existing } = await sb
            .from('leads')
            .select('id, estado')
            .eq('instagram_id', senderId)
            .single()

          if (!existing) {
            await sb.from('leads').insert({
              instagram_id:    senderId,
              username:        userInfo.username || null,
              nombre:          userInfo.name     || null,
              mensaje_inicial: message,
              estado:          'nuevo',
              raw_payload:     event,
            })
            // Auto-reply only to new leads
            await sendIGReply(senderId, AUTO_REPLY, pageToken)
          }
          // If existing lead wrote again, just update timestamp
          else if (existing.estado !== 'registrado') {
            await sb.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    } catch (e) {
      console.error('[meta-webhook]', e)
      return new Response('ok', { status: 200 }) // Always 200 to Meta
    }
  }

  return new Response('ok', { status: 200 })
})
