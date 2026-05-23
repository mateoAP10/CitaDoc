import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  const url  = new URL(req.url)
  const slug = url.searchParams.get('slug') || ''

  if (!slug) {
    return Response.redirect('https://citadoc.lat', 302)
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: m } = await sb
    .from('medicos')
    .select('nombre, apellido, titulo, especialidades, ciudad, pais, foto_url, bio, slug')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  if (!m) return Response.redirect('https://citadoc.lat', 302)

  const nombre     = `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`.trim()
  const specs      = (m.especialidades || []).slice(0, 2).join(' · ')
  const lugar      = [m.ciudad, m.pais].filter(Boolean).join(', ')
  const profileUrl = `https://citadoc.lat/citadoc-perfil.html?slug=${slug}`

  // Premium description for WhatsApp / social previews
  const lines: string[] = []
  if (specs) lines.push(`${specs}`)
  if (lugar) lines.push(`📍 ${lugar}`)
  lines.push('Agenda tu cita online — sin llamadas, 24/7')
  const desc = lines.join(' · ')

  // Use Supabase Storage image transform for a square 1200x1200 crop (WhatsApp/IG friendly)
  let image = 'https://citadoc.lat/og-citadoc.png'
  if (m.foto_url) {
    // Convert /storage/v1/object/public/ → /storage/v1/render/image/public/ with size params
    const renderUrl = m.foto_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    image = renderUrl.includes('/render/image/')
      ? `${renderUrl}?width=1200&height=1200&resize=cover&quality=80`
      : m.foto_url
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=${profileUrl}">
<title>${nombre} | CitaDoc</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="CitaDoc">
<meta property="og:title" content="${nombre} | CitaDoc">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="${nombre} — ${specs || 'Médico en CitaDoc'}">
<meta property="og:url" content="${profileUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${nombre} | CitaDoc">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${profileUrl}">
</head>
<body>
<script>location.replace("${profileUrl}")</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  })
})
