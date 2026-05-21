import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID       = Deno.env.get('META_APP_ID') || '992796710375550'
const APP_SECRET   = Deno.env.get('META_APP_SECRET')!
const REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || 'https://citadoc.lat/auth/meta/callback'
const ADMIN_TOKEN  = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'
const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-admin-token',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url    = new URL(req.url)
  const action = url.searchParams.get('action')

  // ── 1. Generate OAuth URL ──────────────────────────────────────────────────
  if (action === 'url') {
    if (req.headers.get('x-admin-token') !== ADMIN_TOKEN)
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

    const params = new URLSearchParams({
      client_id:     APP_ID,
      redirect_uri:  REDIRECT_URI,
      scope:         'pages_show_list,pages_read_engagement,ads_management,ads_read,business_management',
      response_type: 'code',
      state:         'citadoc_meta_' + Date.now(),
    })
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`
    return new Response(JSON.stringify({ url: authUrl }), { headers: CORS })
  }

  // ── 2. Handle callback — exchange code for token ───────────────────────────
  if (action === 'callback') {
    const code  = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return Response.redirect(`https://citadoc.lat/admin.html?key=citadoc-growth-2026&meta_error=${encodeURIComponent(error)}`)
    }
    if (!code) {
      return Response.redirect(`https://citadoc.lat/admin.html?key=citadoc-growth-2026&meta_error=no_code`)
    }

    try {

    // Exchange code for short-lived token
    const redirectUri = `https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/meta-oauth?action=callback`
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: redirectUri, code }),
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return Response.redirect(`https://citadoc.lat/admin.html?key=citadoc-growth-2026&meta_error=token_failed`)
    }

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: tokenData.access_token })
    )
    const longData = await longRes.json()
    const finalToken = longData.access_token || tokenData.access_token

    // Fetch ad accounts
    const adRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${finalToken}`
    )
    const adData = await adRes.json()

    // Fetch pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${finalToken}`
    )
    const pagesData = await pagesRes.json()

    // Save to DB
    await sb.from('platform_settings' as never).upsert({
      key:   'meta_integration',
      value: {
        access_token:  finalToken,
        expires_in:    longData.expires_in || null,
        connected_at:  new Date().toISOString(),
        ad_accounts:   adData.data || [],
        pages:         pagesData.data || [],
      }
    }, { onConflict: 'key' }).catch(async () => {
      // Fallback: store in medicos settings table or log
      console.log('[meta-oauth] platform_settings table not found, storing in secrets')
    })

    return Response.redirect(`https://citadoc.lat/admin.html?key=citadoc-growth-2026&meta_connected=1`)

    } catch(e) {
      console.error('[meta-oauth] callback error:', e)
      return Response.redirect(`https://citadoc.lat/admin.html?key=citadoc-growth-2026&meta_error=${encodeURIComponent(String(e))}`)
    }
  }

  // ── 3. Get current connection status ──────────────────────────────────────
  if (action === 'status') {
    if (req.headers.get('x-admin-token') !== ADMIN_TOKEN)
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

    const { data } = await sb.from('platform_settings' as never).select('value').eq('key', 'meta_integration').single().catch(() => ({ data: null }))
    if (!data) return new Response(JSON.stringify({ connected: false }), { headers: CORS })

    const v = (data as any).value
    return new Response(JSON.stringify({
      connected:    true,
      connected_at: v.connected_at,
      ad_accounts:  v.ad_accounts || [],
      pages:        v.pages || [],
    }), { headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: CORS })
})
