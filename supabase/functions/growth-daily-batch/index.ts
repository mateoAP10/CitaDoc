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

// ── Brand context ────────────────────────────────────────────────────────────

const BRAND = `CitaDoc es la plataforma AI premium para médicos latinoamericanos.
Propuesta: agenda + pacientes + SOAP + perfil web generado por IA + booking online.
Target: médicos especialistas con consulta privada que usan WhatsApp y Excel.
Posicionamiento: "la capa AI premium del médico moderno". NO software generico.
Tono: premium, calm, aspiracional, medico. Todo en ESPAÑOL.
CTA final: citadoc.lat/generar`

// ── Content generators ───────────────────────────────────────────────────────

async function generateContent(
  type: string,
  kimiKey: string
): Promise<Record<string, string>> {

  const prompts: Record<string, { system: string; user: string }> = {

    reel_hook: {
      system: `${BRAND}\n\nGenera un reel hook para Instagram de 5-8 segundos que interrumpa el scroll y atraiga médicos.
Devuelve JSON: { "hook": "frase impactante 8-12 palabras", "script": "guion 30-45 segundos", "caption": "caption 120 chars + -> citadoc.lat/generar", "hashtags": "6 hashtags medicos reales" }`,
      user: 'Genera un reel hook premium para atraer médicos especialistas a CitaDoc. Ángulo: la diferencia entre un médico con presencia digital premium vs sin ella.',
    },

    carousel: {
      system: `${BRAND}\n\nGenera un carousel de 5 slides para Instagram/LinkedIn que eduque médicos sobre presencia digital premium.
Devuelve JSON: { "title": "titulo del carousel", "slides": [ { "slide": 1, "headline": "...", "body": "..." } ], "cta_slide": { "headline": "...", "cta": "-> citadoc.lat/generar" }, "caption": "120 chars", "hashtags": "6 hashtags" }`,
      user: 'Carousel: "5 razones por las que tu presencia digital define tu práctica médica". Premium, aspiracional, específico para médicos LATAM.',
    },

    ad_copy: {
      system: `${BRAND}\n\nGenera copy de anuncio para Facebook/Instagram Ads dirigido a médicos especialistas.
Devuelve JSON: { "headline": "titular 40 chars max", "primary_text": "texto principal 125 chars", "description": "descripcion 30 chars", "cta_button": "Generar mi demo", "angle": "problema que resuelve" }`,
      user: 'Ad copy para médicos que todavía gestionan su práctica con WhatsApp y Excel. Mostrarles que existe algo mejor.',
    },

    cta_caption: {
      system: `${BRAND}\n\nGenera un caption standalone con CTA fuerte para Instagram.
Devuelve JSON: { "headline": "primera linea impactante", "caption": "caption completo 150 chars max, termina en -> citadoc.lat/generar", "hashtags": "6 hashtags medicos reales" }`,
      user: 'Caption aspiracional que haga que un médico quiera ver cómo se vería su práctica en CitaDoc.',
    },
  }

  const p = prompts[type]
  if (!p) throw new Error(`Unknown type: ${type}`)

  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kimiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      temperature: 0.85,
      max_tokens: 800,
      messages: [
        { role: 'system', content: p.system },
        { role: 'user',   content: p.user },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Kimi ${res.status}`)

  const data  = await res.json()
  const raw   = data.choices?.[0]?.message?.content || ''
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

// ── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SVCKEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const KIMI_API_KEY    = Deno.env.get('KIMI_API_KEY')!

  const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

  // Tipos a generar hoy
  const TYPES = ['reel_hook', 'carousel', 'ad_copy', 'cta_caption']

  const results: { type: string; ok: boolean }[] = []

  for (const type of TYPES) {
    try {
      const content = await generateContent(type, KIMI_API_KEY)
      content.generated_at = new Date().toISOString()

      const { error } = await sb
        .from('growth_content_queue')
        .insert({ type, content_jsonb: content, status: 'pending' })

      results.push({ type, ok: !error })
      if (error) console.error(`Insert error ${type}:`, error)

    } catch (e) {
      console.error(`generate error ${type}:`, e)
      results.push({ type, ok: false })
    }
  }

  return json({
    generated: results.filter(r => r.ok).length,
    total: TYPES.length,
    results,
    timestamp: new Date().toISOString(),
  })
})
