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

// ── SEARCH MATRIX — Ecuador-first, 156 combos únicos ─────────────────────────
// Tier 1 cities (mayor mercado privado)
// Tier 2 cities (mercado medio creciente)
// Tier 3 cities (oportunidad temprana)

const CITIES_T1 = ['Quito', 'Guayaquil', 'Cuenca']
const CITIES_T2 = ['Ambato', 'Machala', 'Manta', 'Loja', 'Portoviejo']
const CITIES_T3 = ['Santo Domingo', 'Ibarra', 'Riobamba', 'Esmeraldas', 'Babahoyo']

// Tier 1 specs: visual, premium, aspiracional — convierten más
const SPECS_T1 = [
  'dermatóloga', 'dermatólogo',
  'cirujano plástico', 'cirujana plástica',
  'médico estético', 'médica estética',
  'odontólogo', 'odontóloga',
  'ginecóloga', 'ginecólogo',
  'nutricionista',
  'psicóloga', 'psicólogo',
  'médico funcional',
]

// Tier 2 specs: alta conversión, práctica privada activa
const SPECS_T2 = [
  'traumatólogo', 'traumatóloga',
  'ortopedista',
  'cardiólogo', 'cardióloga',
  'pediatra',
  'endocrinólogo', 'endocrinóloga',
  'urólogo',
  'oftalmólogo',
]

// Tier 3 specs: volumen, larga cola
const SPECS_T3 = [
  'gastroenterólogo',
  'otorrinolaringólogo',
  'médico general',
  'internista',
  'reumatólogo',
  'neurólogo',
]

function buildMatrix(): { specialty: string; city: string; tier: number }[] {
  const matrix: { specialty: string; city: string; tier: number }[] = []
  // T1 specs × T1 cities = core alta prioridad
  for (const s of SPECS_T1) for (const c of CITIES_T1) matrix.push({ specialty: s, city: c, tier: 1 })
  // T1 specs × T2 cities
  for (const s of SPECS_T1) for (const c of CITIES_T2) matrix.push({ specialty: s, city: c, tier: 2 })
  // T2 specs × T1+T2 cities
  for (const s of SPECS_T2) for (const c of [...CITIES_T1, ...CITIES_T2]) matrix.push({ specialty: s, city: c, tier: 2 })
  // T1 specs × T3 cities
  for (const s of SPECS_T1) for (const c of CITIES_T3) matrix.push({ specialty: s, city: c, tier: 3 })
  // T3 specs × T1 cities
  for (const s of SPECS_T3) for (const c of CITIES_T1) matrix.push({ specialty: s, city: c, tier: 3 })
  return matrix
}

const SEARCH_MATRIX = buildMatrix()

// ── Scoring ──────────────────────────────────────────────────────────────────

const NO_WEBSITE_SIGNALS = ['linktr.ee', 'linktree.com', 'bio.link', 'beacons.ai', 'tap.bio', 'solo.to', 'campsite.bio']
const WEBSITE_BLACKLIST  = [/instagram\.com/i, /linktr\.ee/i, /facebook\.com/i, /twitter\.com/i, /whatsapp/i]

function scoreLead(lead: {
  specialty: string; city: string; tier: number
  website_detected: boolean; website_url: string
  bio_snippet: string; whatsapp_visible: boolean
}): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Sin website = máxima oportunidad CitaDoc
  if (!lead.website_detected) {
    score += 4; reasons.push('sin web propia')
  } else if (NO_WEBSITE_SIGNALS.some(s => (lead.website_url || '').includes(s))) {
    score += 3; reasons.push('solo linktree')
  } else {
    score += 1; reasons.push('tiene web')
  }

  // Ciudad premium Ecuador
  const ecuadorT1 = ['quito', 'guayaquil', 'cuenca']
  const ecuadorT2 = ['ambato', 'machala', 'manta', 'loja', 'portoviejo']
  const cityLow = lead.city.toLowerCase()
  if (ecuadorT1.some(c => cityLow.includes(c))) { score += 2; reasons.push('ciudad T1') }
  else if (ecuadorT2.some(c => cityLow.includes(c))) { score += 1; reasons.push('ciudad T2') }

  // Especialidad
  const premiumSpecs = ['plástic', 'estétic', 'dermatol', 'dental', 'odontol', 'nutrici', 'funcional']
  const highSpecs    = ['traumatol', 'ortoped', 'cardiol', 'neurol', 'ginecol', 'psicol']
  const spec = lead.specialty.toLowerCase()
  if (premiumSpecs.some(s => spec.includes(s))) { score += 3; reasons.push('esp premium') }
  else if (highSpecs.some(s => spec.includes(s))) { score += 2; reasons.push('esp alta conv') }
  else { score += 1 }

  // WhatsApp = práctica privada activa
  if (lead.whatsapp_visible) { score += 1; reasons.push('WA visible') }

  // Tier bonus
  if (lead.tier === 1) score += 1

  return { score: Math.min(score, 10), reason: reasons.join(' · ') }
}

// ── Detector de centros/clínicas — NO son médicos individuales ───────────────

const CENTER_SIGNALS = [
  /centro\s+(médico|dermatol|estét|clín)/i,
  /clínica|clinica/i,
  /consultorio\s+\w+\s+\w+/i,   // consultorio con nombre compuesto = institución
  /instituto\s+(médico|dermatol)/i,
  /\bestetica\b|\bestética\b/i,  // spa/estética general, no médico
  /spa\b/i,
  /salud\s+\w+\s+\w+/i,
  /especialidades\s+médicas/i,
  /\bgroup\b|\bgroup\b|\bcorp\b/i,
  /equipo\s+(de\s+)?médic/i,
  /nuestros\s+médicos/i,
  /\bteam\b/i,
]

function isCenter(title: string, description: string, handle: string): boolean {
  const combined = (title + ' ' + description + ' ' + handle).toLowerCase()
  // Si tiene señal de centro → descartar
  if (CENTER_SIGNALS.some(r => r.test(combined))) return true
  // Si el handle empieza con palabras de institución
  if (/^(centro|clinica|cl_|clinic|estetica|salud|instituto|dermo_center|skin_center)/i.test(handle)) return true
  return false
}

// ── Detector de médico individual ─────────────────────────────────────────────

function isIndividualDoctor(title: string, description: string, handle: string): boolean {
  const combined = (title + ' ' + description).toLowerCase()
  const handleLow = handle.toLowerCase()
  // Señales fuertes de médico individual
  if (/^(dr|dra|dr\.|dra\.)/.test(combined)) return true
  if (/^(dr|dra)[\._]/.test(handleLow)) return true
  if (/\bmd\b|\bespecialista\b|\bmédico\b|\bmédica\b|\bcirujano\b|\bcirujana\b/.test(combined)) return true
  return false
}

// ── Extractor de señales ──────────────────────────────────────────────────────

function extractSignals(title: string, description: string, url: string) {
  const igMatch        = url.match(/instagram\.com\/([^/?#]+)/i)
  const instagram_handle = igMatch ? igMatch[1] : null

  const urlsInDesc   = description.match(/https?:\/\/[^\s,)]+/gi) || []
  const realUrls     = urlsInDesc.filter(u => !WEBSITE_BLACKLIST.some(p => p.test(u)))
  const hasNoWebSig  = NO_WEBSITE_SIGNALS.some(s => description.toLowerCase().includes(s))
  const website_detected = realUrls.length > 0 && !hasNoWebSig
  const website_url      = realUrls[0] || ''
  const whatsapp_visible = /whatsapp|wa\.me|\+\d{10,}/i.test(description)

  let doctor_name = (title.match(/^([^(|·@•\-–]+)/)?.[1] ?? '').trim()
  doctor_name = doctor_name.replace(/\s+(MD|DR|DRA|MÉDICO|MÉDICA|DOCTOR|DOCTORA)\.?\s*$/i, '').trim()

  const looksLikeCenter    = isCenter(title, description, instagram_handle || '')
  const looksLikeDoctor    = isIndividualDoctor(title, description, instagram_handle || '')

  return { instagram_handle, website_detected, website_url, whatsapp_visible, bio_snippet: description.slice(0, 300), doctor_name, looksLikeCenter, looksLikeDoctor }
}

// ── Selección de batch de queries ─────────────────────────────────────────────

function selectBatch(batchSize: number, runIndex: number): typeof SEARCH_MATRIX {
  // Rotate deterministically: cada run usa un bloque diferente del matrix
  // Prioriza tier 1 en los primeros slots del día
  const t1 = SEARCH_MATRIX.filter(m => m.tier === 1)
  const t2 = SEARCH_MATRIX.filter(m => m.tier === 2)
  const t3 = SEARCH_MATRIX.filter(m => m.tier === 3)

  const all = [...t1, ...t2, ...t3]
  const start = (runIndex * batchSize) % all.length
  // Si el batch cruza el fin del array, wrappea
  const batch = []
  for (let i = 0; i < batchSize; i++) {
    batch.push(all[(start + i) % all.length])
  }
  return batch
}

// ── Google Maps (Places Text Search) ─────────────────────────────────────────

// Maps-specific queries: combinaciones specialty × city para Places
const MAPS_QUERIES_T1 = [
  'dermatóloga', 'dermatólogo', 'cirujano plástico', 'cirujana plástica',
  'médico estético', 'odontólogo estético', 'ginecóloga', 'nutricionista',
  'traumatólogo', 'ortopedista', 'cardiólogo', 'pediatra', 'psicóloga',
]

async function fetchGoogleMapsLeads(
  specialty: string,
  city: string,
  apiKey: string,
  tier: number,
): Promise<ReturnType<typeof buildLead>[]> {
  const query    = `${specialty} ${city} Ecuador`
  const mapsUrl  = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=es&region=ec&key=${apiKey}`

  let places: Record<string, unknown>[] = []
  try {
    const res = await fetch(mapsUrl)
    if (res.ok) {
      const data = await res.json()
      places = (data.results || []).slice(0, 20)
    } else {
      console.warn(`[scout-maps] Places ${res.status} for: ${query}`)
    }
  } catch (e) {
    console.error('[scout-maps] fetch error:', e)
  }

  const leads: ReturnType<typeof buildLead>[] = []
  for (const p of places) {
    const name    = String(p.name || '')
    const address = String(p.formatted_address || '')
    const placeId = String(p.place_id || '')
    const rating  = Number(p.rating || 0)
    const reviews = Number(p.user_ratings_total || 0)
    const types   = (p.types as string[]) || []

    // Solo negocios médicos/salud
    const medTypes = ['doctor','dentist','hospital','health','physiotherapist','pharmacy']
    if (!types.some(t => medTypes.includes(t))) continue

    // No queremos cadenas/hospitales grandes
    if (/hospital|clínica \w+ \d+|farma|farmacia/i.test(name)) continue

    // Scoring Maps
    let score = 0
    const reasons: string[] = ['maps']

    // Sin website = oportunidad (lo detectamos por ausencia en el registro básico)
    score += 3; reasons.push('sin web conocida')

    if (rating >= 4.5 && reviews >= 10) { score += 3; reasons.push(`⭐${rating}(${reviews})`) }
    else if (rating >= 4.0)             { score += 2; reasons.push(`⭐${rating}`) }
    else if (rating > 0)                { score += 1 }

    // Tier ciudad
    const cityLow = city.toLowerCase()
    if (['quito','guayaquil','cuenca'].some(c => cityLow.includes(c))) score += 2
    else score += 1

    // Especialidad premium
    const specLow = specialty.toLowerCase()
    if (['plástic','estétic','dermatol','dental','odontol','nutrici','ginecol'].some(s => specLow.includes(s))) score += 2
    else score += 1

    if (tier === 1) score++

    score = Math.min(score, 10)
    if (score < 3) continue

    const profileUrl = placeId
      ? `https://maps.google.com/?cid=${placeId}`
      : `https://maps.google.com/maps/search/${encodeURIComponent(name + ' ' + city)}`

    leads.push(buildLead({
      instagram_handle: null,
      doctor_name:      name,
      specialty,
      city,
      profile_url:      profileUrl,
      website_detected: false,
      website_url:      '',
      whatsapp_visible: false,
      bio_snippet:      `${address} · ⭐${rating} (${reviews} reseñas)`,
      premium_score:    score,
      score_reason:     reasons.join(' · '),
      search_query:     query,
      source:           'google-maps',
    }))
  }

  return leads
}

function buildLead(l: {
  instagram_handle: string | null
  doctor_name: string; specialty: string; city: string
  profile_url: string; website_detected: boolean; website_url: string
  whatsapp_visible: boolean; bio_snippet: string
  premium_score: number; score_reason: string; search_query: string; source: string
}) { return l }

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const BRAVE_KEY    = Deno.env.get('BRAVE_SEARCH_API_KEY')
  const MAPS_KEY     = Deno.env.get('GOOGLE_PLACES_API_KEY') || ''
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!BRAVE_KEY) return json({ error: 'BRAVE_SEARCH_API_KEY no configurada' }, 400)

  const sb   = createClient(SUPABASE_URL, SUPABASE_SVC)
  const body = await req.json().catch(() => ({}))

  // run_index permite al cron pasar 0 (mañana) y 1 (tarde) para rotar el batch
  const runIndex  = typeof body.run_index === 'number' ? body.run_index : Math.floor(Date.now() / 86400000) % SEARCH_MATRIX.length
  const batchSize = typeof body.batch_size === 'number' ? Math.min(body.batch_size, 10) : 5
  const minScore  = typeof body.min_score === 'number' ? body.min_score : 3

  // Modo override manual (desde admin.html)
  const manualTargets: { specialty: string; city: string }[] = body.targets || []
  const targets = manualTargets.length
    ? manualTargets.map(t => ({ ...t, tier: 1 }))
    : selectBatch(batchSize, runIndex)

  const allLeads: {
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

  const queryLog: { query: string; found: number; qualified: number }[] = []

  for (const target of targets) {
    // Brave funciona mejor sin site: y filtrando instagram.com en los resultados
    const query    = `${target.specialty} ${target.city} Ecuador instagram.com`
    const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&search_lang=es&safesearch=off`

    let results: { url: string; title: string; description: string }[] = []
    try {
      const res = await fetch(braveUrl, {
        headers: {
          'Accept':               'application/json',
          'Accept-Encoding':      'gzip',
          'X-Subscription-Token': BRAVE_KEY,
        },
      })
      if (res.ok) {
        const data = await res.json()
        results = data.web?.results || []
      } else {
        console.warn(`[scout] Brave ${res.status} for query: ${query}`)
      }
    } catch (e) {
      console.error('[scout] fetch error:', e)
    }

    let qualified = 0
    for (const r of results) {
      if (!r.url?.includes('instagram.com')) continue

      const signals = extractSignals(r.title || '', r.description || '', r.url)
      if (!signals.instagram_handle) continue

      // Descartar centros/clínicas — solo queremos médicos individuales
      if (signals.looksLikeCenter) continue

      const { score: baseScore, reason } = scoreLead({
        specialty:        target.specialty,
        city:             target.city,
        tier:             target.tier,
        website_detected: signals.website_detected,
        website_url:      signals.website_url,
        bio_snippet:      signals.bio_snippet,
        whatsapp_visible: signals.whatsapp_visible,
      })
      // Boost si confirma ser médico individual
      const score = signals.looksLikeDoctor ? Math.min(baseScore + 2, 10) : baseScore

      if (score < minScore) continue

      allLeads.push({
        instagram_handle: signals.instagram_handle,
        doctor_name:      signals.doctor_name,
        specialty:        target.specialty,
        city:             target.city,
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
      qualified++
    }

    queryLog.push({ query, found: results.length, qualified })
    await new Promise(r => setTimeout(r, 300))
  }

  // ── Google Maps batch (3 queries por run, rotan independiente) ────────────
  const mapsLeads: typeof allLeads = []
  const mapsLog: { query: string; found: number; qualified: number }[] = []

  if (MAPS_KEY) {
    const mapsSpecialties = MAPS_QUERIES_T1
    const mapsTargetCount = 3
    const mapsStart = (runIndex * mapsTargetCount) % (mapsSpecialties.length * CITIES_T1.length)
    const mapsCombos = []
    for (const s of mapsSpecialties) for (const c of CITIES_T1) mapsCombos.push({ specialty: s, city: c })

    for (let i = 0; i < mapsTargetCount; i++) {
      const t = mapsCombos[(mapsStart + i) % mapsCombos.length]
      const leads = await fetchGoogleMapsLeads(t.specialty, t.city, MAPS_KEY, 1)
      mapsLeads.push(...leads)
      mapsLog.push({ query: `maps:${t.specialty}/${t.city}`, found: leads.length, qualified: leads.length })
      await new Promise(r => setTimeout(r, 400))
    }
  }

  // ── Insert — skip duplicates por instagram_handle o profile_url ─────────
  let inserted = 0
  let lastError = ''

  // Cargar handles ya existentes para deduplicar sin upsert
  const handles = allLeads.map(l => l.instagram_handle).filter(Boolean)
  const urls    = allLeads.map(l => l.profile_url).filter(Boolean)

  const { data: existingHandles } = handles.length
    ? await sb.from('doctor_leads').select('instagram_handle').in('instagram_handle', handles)
    : { data: [] }
  const { data: existingUrls } = urls.length
    ? await sb.from('doctor_leads').select('profile_url').in('profile_url', urls)
    : { data: [] }

  const knownHandles = new Set((existingHandles || []).map((r: Record<string,string>) => r.instagram_handle))
  const knownUrls    = new Set((existingUrls    || []).map((r: Record<string,string>) => r.profile_url))

  for (const lead of allLeads) {
    const isDup = (lead.instagram_handle && knownHandles.has(lead.instagram_handle))
               || knownUrls.has(lead.profile_url)
    if (isDup) continue
    const { error } = await sb.from('doctor_leads').insert(lead)
    if (!error) {
      inserted++
      if (lead.instagram_handle) knownHandles.add(lead.instagram_handle)
      knownUrls.add(lead.profile_url)
    } else {
      lastError = error.message
    }
  }

  // ── Upsert Maps leads (conflict on profile_url) ──────────────────────────
  let insertedMaps = 0
  for (const lead of mapsLeads) {
    // Check if this Maps place already exists
    const { data: exists } = await sb
      .from('doctor_leads')
      .select('id')
      .eq('profile_url', lead.profile_url)
      .limit(1)
    if (exists && exists.length > 0) continue
    const { error } = await sb.from('doctor_leads').insert(lead)
    if (!error) insertedMaps++
  }

  return json({
    run_index:    runIndex,
    batch_size:   targets.length,
    queries:      [...queryLog, ...mapsLog],
    found_total:  queryLog.reduce((a, q) => a + q.found, 0),
    qualified:    allLeads.length,
    inserted,
    last_error: lastError || null,
    maps_qualified: mapsLeads.length,
    maps_inserted:  insertedMaps,
    maps_enabled:   !!MAPS_KEY,
    matrix_size:  SEARCH_MATRIX.length,
    timestamp:    new Date().toISOString(),
  })
})
