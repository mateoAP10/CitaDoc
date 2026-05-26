import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

// ── Slug generator ──────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
    .replace(/\s+/g, '-')
}

function buildSlug(name: string, specialty: string): string {
  // Strip titles: Dr., Dra., Dr, Dra
  const cleanName = name.replace(/^(dra?\.?\s+)/i, '').trim()
  const namePart  = normalize(cleanName).split('-').slice(0, 2).join('-')
  const specPart  = normalize(specialty).split('-')[0]
  const hash      = Math.random().toString(36).substring(2, 6)
  return `dr-${namePart}-${specPart}-${hash}`
}

// ── REGLA PERMANENTE: MOBILE FIRST SIEMPRE ───────────────────────────────────
// Todas las webs de CitaDoc son mobile-first por diseño. Los layouts renderizan
// en 430px max-width centrado. La IA genera contenido (copy, colores, servicios)
// pero los renderers JS controlan el HTML/CSS — que siempre es mobile-first.
// NUNCA generar layouts wide-first, tablas, columnas multi-columna en hero.
// ─────────────────────────────────────────────────────────────────────────────

// ── Kimi prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un AI de branding médico para CitaDoc, plataforma premium para médicos latinoamericanos.
Genera una configuración de sitio web premium para un médico. Devuelve SOLO JSON válido. Sin markdown, sin bloques de código.

Campos requeridos:
- headline: titular orientado al paciente, máx 75 chars, empieza con verbo resultado (Recupera, Retoma, Libera, Regresa, Vuelve)
- subheadline: 1-2 oraciones de valor real, máx 130 chars
- about_text: 2 párrafos historia profesional, cálida y creíble
- philosophy: frase manifesto exactamente 10-15 palabras
- doctor_story: 1 párrafo origen y formación
- differentiators: array de 5 ventajas técnicas concretas (strings)
- treatment_approach: descripción de metodología
- patient_experience: cómo se siente el paciente en la consulta
- visual_dna: exactamente uno de: clinic, sports, luxury, authority, warm, modern
- tone: exactamente uno de: confianza-clinica, cercania-humana, elegancia-premium, innovacion-tecnica
- primary_color: color hex que refleja la personalidad de la especialidad (#rrggbb)
- services: array de exactamente 4 objetos {t: nombre servicio, d: descripción 10-15 palabras, i: un emoji}
- cta_primary: "Agendar cita"
- cta_final: frase cierre máx 60 chars con autoridad o calidez
- seo_title: "Dr/Dra. [Nombre] — [Especialidad] en [Ciudad o LATAM]"
- seo_description: 150-160 chars propuesta de valor

Reglas:
- Todo en español
- Nunca usar: "su salud es nuestra prioridad", "atención de calidad", adjetivos vacíos
- Verbos resultado: recupera, retoma, libera, regresa (no conquista, domina)
- Muy específico a la especialidad`

// ── Claude prompt ────────────────────────────────────────────────────────────

const CLAUDE_SYSTEM_PROMPT = `Eres el director creativo de identidad médica premium de CitaDoc LATAM.
Si recibes imágenes del médico o logo: analízalas y úsalas para hacer la identidad ÚNICA de esta persona.
Devuelve SOLO JSON válido. Sin markdown. Sin texto fuera del JSON. Todo en español latino.

Campos requeridos:
- headline: titular orientado al resultado del paciente, máx 75 chars, verbo acción (Recupera, Retoma, Libera, Vuelve, Restaura)
- subheadline: 1-2 oraciones de valor real y específico, máx 130 chars
- about_text: 2 párrafos historia profesional — debe mencionar hechos reales de la bio
- philosophy: frase manifesto exactamente 10-15 palabras — debe resonar con lo que la bio revela de este médico
- doctor_story: 1 párrafo origen y formación — extraído de la bio, con hechos específicos
- differentiators: array 5 ventajas técnicas concretas y verificables — cada una basada en un hecho de la bio o la especialidad
- treatment_approach: metodología clínica específica a este médico
- patient_experience: cómo se siente el paciente desde la primera consulta
- visual_dna: uno de: clinic, sports, luxury, authority, warm, modern
- tone: uno de: confianza-clinica, cercania-humana, elegancia-premium, innovacion-tecnica
- primary_color: hex de identidad derivado del logo (si hay) o la especialidad (#rrggbb)
- services: array 4 objetos {t: nombre servicio, d: descripción 10-15 palabras, i: emoji} — basados en lo que menciona la bio
- cta_primary: "Agendar cita"
- cta_final: frase cierre máx 60 chars con autoridad o calidez
- seo_title: "Dr/Dra. [Nombre] — [Especialidad] en [Ciudad o LATAM]"
- seo_description: 150-160 chars propuesta de valor única

Reglas CRÍTICAS:
- MOBILE FIRST SIEMPRE: el contenido se renderiza en un layout móvil de 430px max-width. Textos cortos, headlines de máximo 6 palabras en hero, descripciones concisas. Nunca estructuras que requieran pantalla ancha.
- BIO ES LA FUENTE PRIMARIA: si hay bio, es el insumo más importante. Extrae todos los hechos concretos que mencione: años de experiencia, instituciones donde se formó, técnicas o procedimientos que domina, logros, filosofía de vida, valores. Cada hecho debe aparecer en algún campo del JSON. Nada inventado que contradiga la bio.
- Si hay logo: extrae su color dominante como primary_color
- Si hay foto del médico: analiza postura, expresión, vestimenta — úsalo para reforzar el tono del copy
- Nunca frases genéricas. Todo específico a esta especialidad y este médico en particular
- powered_by: incluir este campo con valor "claude"`

// ── Claude API call ──────────────────────────────────────────────────────────

async function callClaudeAPI(
  name: string, spec: string, cityStr: string, bio: string,
  photo_url: string | null, logo_url: string | null,
  apiKey: string
): Promise<Record<string, unknown>> {
  const contentBlocks: unknown[] = []

  if (photo_url) {
    contentBlocks.push({ type: 'image', source: { type: 'url', url: photo_url } })
    contentBlocks.push({ type: 'text', text: 'Foto profesional del médico.' })
  }
  if (logo_url) {
    contentBlocks.push({ type: 'image', source: { type: 'url', url: logo_url } })
    contentBlocks.push({ type: 'text', text: 'Logo de la práctica médica.' })
  }

  const bioBlock = bio
    ? `\n\nBIO DEL MÉDICO (fuente primaria — extraer todos los hechos para construir la identidad):\n"${bio}"\n\nTodo lo que dice la bio debe reflejarse en algún campo: about_text, doctor_story, differentiators, philosophy, services o headline. No inventar hechos. No ignorar ningún dato de la bio.`
    : ''

  const info = [
    `MÉDICO: ${name}`,
    `ESPECIALIDAD: ${spec}`,
    cityStr && `CIUDAD: ${cityStr}`,
  ].filter(Boolean).join('\n') + bioBlock + '\n\nDevuelve SOLO JSON válido. Sin markdown.'

  contentBlocks.push({ type: 'text', text: info })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2200,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Claude API ${res.status}: ${txt.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(text)
}

// ── Fallback config ──────────────────────────────────────────────────────────

// ── Legacy DNA → nuevo sistema de layouts ────────────────────────────────────
// dna: qué tipo visual es (mood, tone, emotion)
// selected_layout: qué renderer usar (surgical-authority, warm-human-care, performance-athletic)
const DNA_BY_SPECIALTY: Record<string, string> = {
  traumatol: 'performance-athletic', ortoped: 'performance-athletic',
  cirug: 'surgical-authority',       cardiol: 'surgical-authority',
  dermatol: 'surgical-authority',    ginecol: 'warm-human-care',
  neurol: 'surgical-authority',      pediatr: 'warm-human-care',
  rehabilit: 'performance-athletic', fisio: 'performance-athletic',
  oncol: 'surgical-authority',       urol: 'surgical-authority',
  psicol: 'warm-human-care',         famili: 'warm-human-care',
}

// selected_layout: el renderer exacto del nuevo engine
const LAYOUT_BY_DNA: Record<string, string> = {
  'surgical-authority':   'surgical-authority',
  'performance-athletic': 'performance-athletic',
  'warm-human-care':      'warm-human-care',
}

function buildFallback(name: string, specialty: string, city: string): Record<string, unknown> {
  const key = Object.keys(DNA_BY_SPECIALTY).find(k => normalize(specialty).includes(k))
  const visual_dna = key ? DNA_BY_SPECIALTY[key] : 'authority'

  return {
    headline: `Recupera tu calidad de vida con atención de especialista`,
    subheadline: `${name} — Diagnóstico preciso y tratamiento personalizado en ${specialty}${city ? ` en ${city}` : ''}.`,
    about_text: `Formado con los más altos estándares en ${specialty}, el Dr. ${name} combina experiencia clínica con un enfoque humano excepcional.\n\nSu práctica está diseñada para que cada paciente reciba atención de primer nivel con resultados medibles.`,
    philosophy: `Medicina de precisión con trato humano en cada consulta`,
    doctor_story: `Con años de experiencia en ${specialty}, ${name} se especializó buscando ofrecer una medicina diferente: técnicamente superior y profundamente humana.`,
    differentiators: [
      'Diagnóstico preciso desde la primera consulta',
      'Tratamiento personalizado para tu caso específico',
      'Tecnología de última generación',
      'Seguimiento continuo de tu evolución',
      'Tiempo real de atención, sin esperas',
    ],
    treatment_approach: `Evaluación integral con énfasis en diagnóstico temprano y tratamiento minimamente invasivo cuando es posible.`,
    patient_experience: `Un espacio moderno, tranquilo y privado donde cada detalle está pensado para tu bienestar desde el primer contacto.`,
    visual_dna,
    tone: 'confianza-clinica',
    primary_color: '#1a2744',
    services: [
      { t: `Consulta de ${specialty}`, d: 'Evaluación completa con diagnóstico preciso y plan de tratamiento claro', i: '🩺' },
      { t: 'Segunda opinión', d: 'Análisis experto de diagnósticos previos para mayor certeza en tu decisión', i: '📋' },
      { t: 'Control y seguimiento', d: 'Monitoreo continuo de tu evolución con ajustes al tratamiento en tiempo real', i: '📊' },
      { t: 'Procedimientos especializados', d: 'Intervenciones de alta precisión con resultados comprobados y recuperación rápida', i: '⚕️' },
    ],
    cta_primary: 'Agendar cita',
    cta_final: 'Tu especialista de confianza, cuando más lo necesitas',
    seo_title: `${name} — ${specialty}${city ? ` en ${city}` : ''}`,
    seo_description: `Especialista en ${specialty}. Diagnóstico preciso, tratamiento personalizado y seguimiento continuo. Agenda tu cita hoy.`,
  }
}

// ── Rate limit simple por IP ─────────────────────────────────────────────────

async function checkDemoRateLimit(ip: string, sb: ReturnType<typeof createClient>): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  const { count } = await sb
    .from('generated_demos')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo)

  // Max 5 demos por IP por hora — ajustar en producción
  // Usamos conteo global en V1 (IP header no siempre confiable con proxies)
  return (count ?? 0) < 500
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const t0 = Date.now()

  try {
    const body = await req.json().catch(() => ({}))
    const { doctor_name, specialty, city, logo_url, photo_url, custom_slug, medico_id, is_real, bio, engine, selected_layout_override } = body

    if (!doctor_name?.trim() || !specialty?.trim()) {
      return json({ error: 'doctor_name and specialty son requeridos' }, 400)
    }

    const name    = String(doctor_name).trim()
    const spec    = String(specialty).trim()
    const cityStr = city ? String(city).trim() : ''

    const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SVCKEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const KIMI_API_KEY      = Deno.env.get('KIMI_API_KEY')
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

    const useClaude = engine === 'claude' && !!ANTHROPIC_API_KEY
    let web_config: Record<string, unknown>
    let source = useClaude ? 'claude' : 'kimi'

    try {
      if (useClaude) {
        // ── Generar con Claude ─────────────────────────────────────────────
        web_config = await callClaudeAPI(name, spec, cityStr, bio || '', photo_url || null, logo_url || null, ANTHROPIC_API_KEY!)
      } else {
        // ── Generar con Kimi ───────────────────────────────────────────────
        if (!KIMI_API_KEY) throw new Error('KIMI_API_KEY missing')

        const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KIMI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'moonshot-v1-8k',
            temperature: 0.8,
            max_tokens: 2000,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: `Médico: ${name}\nEspecialidad: ${spec}${cityStr ? `\nCiudad: ${cityStr}` : ''}${bio ? `\nBio: ${bio}` : ''}\n\nGenera el web config JSON premium.`,
              },
            ],
          }),
        })

        if (!res.ok) throw new Error(`Kimi ${res.status}`)

        const data = await res.json()
        const raw  = data.choices?.[0]?.message?.content || ''
        const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        web_config = JSON.parse(clean)
      }

    } catch (e) {
      console.warn(`${source} fallback:`, e)
      web_config = buildFallback(name, spec, cityStr)
      source = 'fallback'
    }

    // Garantizar campos críticos
    if (!web_config.cta_primary) web_config.cta_primary = 'Agendar cita'
    if (!web_config.visual_dna)  web_config.visual_dna  = 'authority'
    web_config.generated_at = new Date().toISOString()
    web_config.source       = source
    web_config.powered_by   = source

    const dna = String(web_config.visual_dna || 'surgical-authority')

    // Layout: respetar override manual del admin, sino derivar del DNA
    const selected_layout = selected_layout_override
      ? String(selected_layout_override)
      : (LAYOUT_BY_DNA[dna] || 'surgical-authority')

    const hero_title      = String(web_config.headline || '')
    const generation_time_ms = Date.now() - t0

    web_config.selected_layout = selected_layout
    web_config.visual_dna      = dna

    // ── Insertar en DB ──────────────────────────────────────────────────────
    const slug = custom_slug ? String(custom_slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : buildSlug(name, spec)
    const demoStatus = (is_real || medico_id) ? 'active' : 'demo'

    const { data: demo, error } = await sb
      .from('generated_demos')
      .insert({
        slug,
        doctor_name:      name,
        specialty:        spec,
        city:             cityStr || null,
        logo_url:         logo_url || null,
        photo_url:        photo_url || null,
        web_config_jsonb: web_config,
        dna,
        selected_layout,
        hero_title,
        generation_time_ms,
        payment_status:   is_real ? 'paid' : 'pending',
        status:           demoStatus,
        medico_id:        medico_id || null,
      })
      .select('id, slug, created_at')
      .single()

    if (error) throw error

    const demo_url = `https://citadoc.lat/demo/${demo.slug}`

    // Showcase se genera vía pg_cron cada 5 min para demos sin showcase_content

    return json({
      slug: demo.slug,
      demo_url,
      hero_title,
      dna,
      generation_time_ms,
      source,
    })

  } catch (err) {
    console.error('generate-demo error:', err)
    return json({ error: 'Error interno del servidor' }, 500)
  }
})
