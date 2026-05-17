import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

// ── Targets de búsqueda — rotan diariamente ──────────────────────────────────

const SEARCH_MATRIX = [
  // specialty × city
  { specialty: 'traumatólogo', city: 'Guayaquil' },
  { specialty: 'dermatóloga',  city: 'Guayaquil' },
  { specialty: 'cirujano plástico', city: 'Quito' },
  { specialty: 'ginecóloga',   city: 'Quito' },
  { specialty: 'traumatólogo', city: 'Quito' },
  { specialty: 'dermatólogo',  city: 'Bogotá' },
  { specialty: 'cirujana plástica', city: 'Medellín' },
  { specialty: 'ortopedista',  city: 'Guayaquil' },
  { specialty: 'cardiólogo',   city: 'Quito' },
  { specialty: 'odontólogo',   city: 'Guayaquil' },
  { specialty: 'nutricionista', city: 'Quito' },
  { specialty: 'médico estético', city: 'Guayaquil' },
]

// ── Dominios que indican ausencia de website propio ──────────────────────────

const NO_WEBSITE_SIGNALS = [
  'linktr.ee', 'linktree.com',
  'instagram.com', 'bio.link',
  'beacons.ai', 'tap.bio',
  'solo.to', 'campsite.bio',
]

const WEBSITE_BLACKLIST_PATTERNS = [
  /instagram\.com/i,
  /linktr\.ee/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /whatsapp/i,
]

// ── Scoring ──────────────────────────────────────────────────────────────────

function scoreLeadVision(lead: {
  specialty: string; city: string;
  website_detected: boolean; website_url: string;
  bio_snippet: string; whatsapp_visible: boolean;
}): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Sin website propio = máxima oportunidad
  if (!lead.website_detected) {
    score += 4
    reasons.push('sin web propia')
  } else if (NO_WEBSITE_SIGNALS.some(s => (lead.website_url || '').includes(s))) {
    score += 3
    reasons.push('solo linktree/link en bio')
  }

  // Ciudades target premium
  const premiumCities = ['guayaquil', 'quito', 'bogotá', 'bogota', 'medellín', 'medellin', 'lima', 'santiago']
  if (premiumCities.some(c => lead.city.toLowerCase().includes(c))) {
    score += 2
    reasons.push('ciudad premium')
  }

  // Especialidades visuales/aspiracionales convierten mejor
  const premiumSpecs = ['plástic', 'estétic', 'dermatol', 'dental', 'odontol', 'nutrici']
  const highSpecs    = ['traumatol', 'ortoped', 'cardiol', 'neurol', 'ginecol']
  const spec = lead.specialty.toLowerCase()

  if (premiumSpecs.some(s => spec.includes(s))) {
    score += 3; reasons.push('especialidad premium/visual')
  } else if (highSpecs.some(s => spec.includes(s))) {
    score += 2; reasons.push('especialidad alta conversión')
  } else {
    score += 1
  }

  // WhatsApp visible = médico con práctica privada activa
  if (lead.whatsapp_visible) {
    score += 1; reasons.push('WhatsApp visible')
  }

  return { score: Math.min(score, 10), reason: reasons.join(' · ') }
}

// ── Extractor de señales desde snippet de búsqueda ───────────────────────────

function extractSignals(title: string, description: string, url: string): {
  instagram_handle: string | null
  website_detected: boolean
  website_url: string
  whatsapp_visible: boolean
  bio_snippet: string
  doctor_name: string
} {
  // Extraer handle de Instagram de la URL
  const igMatch = url.match(/instagram\.com\/([^/?#]+)/i)
  const instagram_handle = igMatch ? igMatch[1] : null

  // Detectar website en la descripción (buscamos URLs que NO sean redes sociales)
  const urlsInDesc = description.match(/https?:\/\/[^\s,)]+/gi) || []
  const realUrls   = urlsInDesc.filter(u =>
    !WEBSITE_BLACKLIST_PATTERNS.some(p => p.test(u))
  )
  const website_detected = realUrls.length > 0
  const website_url      = realUrls[0] || ''

  // También detectar si la descripción menciona website pero solo linktree
  const hasNoWebSignal = NO_WEBSITE_SIGNALS.some(s => description.toLowerCase().includes(s))

  // WhatsApp visible
  const whatsapp_visible = /whatsapp|wa\.me|\+\d{10,}/i.test(description)

  // Nombre del médico desde el título
  const nameMatch = title.match(/^([^(|·@•]+)/)?.[1]?.trim() || ''

  return {
    instagram_handle,
    website_detected: website_detected && !hasNoWebSignal,
    website_url,
    whatsapp_visible,
    bio_snippet: description.slice(0, 300),
    doctor_name: nameMatch,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const BRAVE_KEY    = Deno.env.get('BRAVE_SEARCH_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!BRAVE_KEY) {
    return json({ error: 'BRAVE_SEARCH_API_KEY no configurada. Ve a api.search.brave.com para obtener una.' }, 400)
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

  // Rotar target según día del año para variedad
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const target    = SEARCH_MATRIX[dayOfYear % SEARCH_MATRIX.length]

  const body = await req.json().catch(() => ({}))
  const specialty = body.specialty || target.specialty
  const city      = body.city      || target.city
  const limit     = Math.min(body.limit || 10, 20)

  // Query Brave Search
  const query   = `site:instagram.com "${specialty}" "${city}"`
  const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&country=ec&search_lang=es`

  const braveRes = await fetch(braveUrl, {
    headers: {
      'Accept':              'application/json',
      'Accept-Encoding':     'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  })

  if (!braveRes.ok) {
    const err = await braveRes.text()
    return json({ error: `Brave API error ${braveRes.status}: ${err}` }, 500)
  }

  const braveData = await braveRes.json()
  const results   = braveData.web?.results || []

  const leads: {
    instagram_handle: string | null
    doctor_name: string
    specialty: string
    city: string
    profile_url: string
    website_detected: boolean
    website_url: string
    whatsapp_visible: boolean
    bio_snippet: string
    premium_score: number
    score_reason: string
    search_query: string
    source: string
  }[] = []

  for (const r of results) {
    if (!r.url?.includes('instagram.com')) continue

    const signals = extractSignals(r.title || '', r.description || '', r.url)

    // Solo nos interesan perfiles sin website propio
    if (signals.website_detected) continue

    const { score, reason } = scoreLeadVision({
      specialty,
      city,
      website_detected: signals.website_detected,
      website_url:      signals.website_url,
      bio_snippet:      signals.bio_snippet,
      whatsapp_visible: signals.whatsapp_visible,
    })

    if (score < 4) continue // Solo leads de calidad

    leads.push({
      instagram_handle: signals.instagram_handle,
      doctor_name:      signals.doctor_name,
      specialty,
      city,
      profile_url:      r.url,
      website_detected: signals.website_detected,
      website_url:      signals.website_url,
      whatsapp_visible: signals.whatsapp_visible,
      bio_snippet:      signals.bio_snippet,
      premium_score:    score,
      score_reason:     reason,
      search_query:     query,
      source:           'brave-search',
    })
  }

  // Insertar leads nuevos (ignorar duplicados por handle)
  let inserted = 0
  for (const lead of leads) {
    const { error } = await sb
      .from('doctor_leads')
      .upsert(lead, { onConflict: 'instagram_handle', ignoreDuplicates: true })
    if (!error) inserted++
  }

  return json({
    query,
    found:    results.length,
    qualified: leads.length,
    inserted,
    timestamp: new Date().toISOString(),
  })
})
