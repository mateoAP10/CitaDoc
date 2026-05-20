import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BASE = 'https://citadoc.lat'
const TODAY = new Date().toISOString().split('T')[0]

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: medicos } = await sb
    .from('medicos')
    .select('slug, updated_at')
    .eq('activo', true)
    .not('slug', 'is', null)

  const urls = (medicos || []).map(m => `
  <url>
    <loc>${BASE}/citadoc-perfil.html?slug=${encodeURIComponent(m.slug)}</loc>
    <lastmod>${(m.updated_at || TODAY).split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  })
})
