import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-A2.8 -- funcion exclusivamente batch, sin caso de uso publico. Sin
// auth (verify_jwt=true = "cualquier usuario autenticado", sin chequeo
// propio) generaba hasta 3 llamadas reales a Kimi + mutaba hasta 3
// generated_demos por invocacion. Sin cron activo hoy (el
// "auto-showcase-batch" del inventario de admin-agents no existe en
// cron.job) -- no se resucita ese cron en este bloque, queda listo para
// cuando exista un caller real.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

// ── Kimi showcase logic — inline para evitar auth cross-function ─────────────

const SYSTEM_PROMPT = `Eres un experto en marketing de medicina premium para LATAM.
Generas contenido de showcase para Instagram y Stories que atrae a medicos a unirse a CitaDoc.
Devuelve SOLO JSON valido. Sin markdown, sin bloques de codigo.

El JSON debe tener exactamente:
- headline: titular premium max 75 chars sobre el medico y su identidad
- caption: maximo 140 caracteres de texto. La ultima linea SIEMPRE es "-> citadoc.lat/generar"
- story_text: 2-3 lineas cortas e impactantes para Instagram Stories
- hashtags: exactamente 6 hashtags reales de medicina latinoamericana

Reglas: TODO en ESPANOL. TERCERA PERSONA. Dr. hombres, Dra. mujeres. Tono premium y calm.`

const SPECIALTY_TAGS: Record<string, string> = {
  traumatol: '#traumatologia #ortopedia #medicinaortopedica #recuperacion',
  ortoped:   '#traumatologia #ortopedia #medicinaortopedica #recuperacion',
  cirug:     '#cirugiaplastica #esteticamedica #bellezapremium #transformacion',
  dermatol:  '#dermatologia #saludpiel #esteticadermatologica #cuidadopiel',
  ginecol:   '#ginecologia #saludfemenina #obstetricia #medicinafemenina',
  odontol:   '#odontologia #periodoncia #saludbucal #sonrisapremium',
  cardiol:   '#cardiologia #saludcardiaca #medicinacardiovascular #corazon',
  pediatr:   '#pediatria #saludinfantil #medicoslatam #ninosSanos',
  default:   '#medicinapremium #medicoslatam #saludpremium #medicinamoderna',
}

function getHashtags(specialty: string): string {
  const s = specialty.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const key = Object.keys(SPECIALTY_TAGS).find(k => k !== 'default' && s.includes(k))
  return (SPECIALTY_TAGS[key || 'default'] + ' #medicinapremium #citadoc')
    .split(' ').filter(Boolean).slice(0, 8).join(' ')
}

function getTitulo(name: string): string {
  const first = name.replace(/^(dra?\.?\s+)/i, '').trim().split(' ')[0].toLowerCase()
  const fem   = ['yudy','karen','maria','sofia','laura','ana','paola','carolina','andrea','natalia','isabella','valentina','daniela']
  return fem.some(n => first.includes(n)) ? 'Dra.' : 'Dr.'
}

function fixCaption(raw: string): string {
  const cta  = '-> citadoc.lat/generar'
  const body = raw.replace(/->\s*citadoc\.lat\/generar/g, '').replace(/→.*$/, '').trim()
  const MAX  = 140
  let short  = body
  if (body.length > MAX) {
    const words = body.split(' ')
    short = ''
    for (const w of words) {
      if ((short + ' ' + w).trim().length > MAX) break
      short = (short + ' ' + w).trim()
    }
    short = short + '...'
  }
  return short + '\n' + cta
}

async function generateShowcase(demo: Record<string, string>, kimiKey: string): Promise<Record<string, string>> {
  const titulo    = getTitulo(demo.doctor_name)
  const cleanName = demo.doctor_name.replace(/^(dra?\.?\s+)/i, '').trim()

  try {
    const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kimiKey}` },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        temperature: 0.78,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Medico: ${titulo} ${cleanName}\nEspecialidad: ${demo.specialty}\nHero: "${demo.hero_title}"\n\nGenera el showcase en espanol.` },
        ],
      }),
    })

    if (!res.ok) throw new Error(`Kimi ${res.status}`)
    const data    = await res.json()
    const raw     = data.choices?.[0]?.message?.content || ''
    const clean   = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(clean)

    if (parsed.caption)  parsed.caption  = fixCaption(parsed.caption)
    parsed.hashtags = getHashtags(demo.specialty)
    return parsed

  } catch {
    return {
      headline:   `${titulo} ${cleanName} — identidad médica premium en CitaDoc`,
      caption:    `${demo.specialty} con presencia digital premium.\n-> citadoc.lat/generar`,
      story_text: `Tu practica merece verse asi.\nCitaDoc genera tu sitio con IA.`,
      hashtags:   getHashtags(demo.specialty),
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status)
  }

  const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVCKEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const KIMI_API_KEY    = Deno.env.get('KIMI_API_KEY')!

  const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

  // Buscar demos sin showcase (máx 3 por run para no exceder timeout)
  const { data: pending } = await sb
    .from('generated_demos')
    .select('slug, doctor_name, specialty, hero_title, dna')
    .is('showcase_content', null)
    .eq('status', 'demo')
    .order('created_at', { ascending: true })
    .limit(3)

  if (!pending || pending.length === 0) {
    return json({ processed: 0, message: 'No pending demos' })
  }

  const results: { slug: string; ok: boolean }[] = []

  for (const demo of pending) {
    try {
      const showcase = await generateShowcase(demo, KIMI_API_KEY)
      showcase.generated_at = new Date().toISOString()
      showcase.source       = 'batch-kimi'

      const { error } = await sb
        .from('generated_demos')
        .update({ showcase_content: showcase })
        .eq('slug', demo.slug)

      results.push({ slug: demo.slug, ok: !error })
    } catch (e) {
      console.error(`batch showcase failed ${demo.slug}:`, e)
      results.push({ slug: demo.slug, ok: false })
    }
  }

  return json({ processed: results.length, results, timestamp: new Date().toISOString() })
})
