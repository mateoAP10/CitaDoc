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

const SYSTEM_PROMPT = `Eres un experto en marketing de medicina premium para LATAM.
Generas contenido de showcase para Instagram y Stories que atrae a médicos a unirse a CitaDoc.
El tono es: aspiracional, premium, calm, médico. NO marketing gritón. NO emojis exagerados.
Devuelve SOLO JSON válido. Sin markdown, sin bloques de código.

El JSON debe tener exactamente:
- headline: titular premium máx 80 chars (sobre el médico y su identidad)
- caption: caption Instagram 150-220 chars, aspiracional, la ÚLTIMA línea SIEMPRE debe ser exactamente "→ citadoc.lat/generar"
- story_text: texto para Stories, 2-3 líneas cortas, impactante, directo
- hashtags: string con 6-8 hashtags relevantes (#medicinapremium #citadoc incluidos siempre)

Reglas:
- Menciona el nombre del médico con título (Dr./Dra.)
- Menciona la especialidad de forma natural
- El hero_title del demo puede usarse como quote aspiracional
- CTA siempre apunta a: citadoc.lat/generar
- Todo en español
- Tono: premium, calm, médico — nunca agresivo ni de ventas`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { slug } = await req.json().catch(() => ({}))
    if (!slug?.trim()) return json({ error: 'slug es requerido' }, 400)

    const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SVCKEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const KIMI_API_KEY    = Deno.env.get('KIMI_API_KEY')!

    const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

    // Leer demo
    const { data: demo, error: fetchErr } = await sb
      .from('generated_demos')
      .select('id, slug, doctor_name, specialty, hero_title, dna')
      .eq('slug', slug)
      .single()

    if (fetchErr || !demo) return json({ error: 'Demo no encontrado' }, 404)

    // Llamar Kimi
    const userPrompt = `Médico: ${demo.doctor_name}
Especialidad: ${demo.specialty}
Hero del sitio: "${demo.hero_title}"
DNA visual: ${demo.dna}
URL del demo: citadoc.lat/demo/${demo.slug}

Genera el showcase content para atraer más médicos a CitaDoc.`

    let showcase: Record<string, string>
    let source = 'kimi'

    try {
      const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIMI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          temperature: 0.82,
          max_tokens: 600,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userPrompt },
          ],
        }),
      })

      if (!res.ok) throw new Error(`Kimi ${res.status}`)

      const data  = await res.json()
      const raw   = data.choices?.[0]?.message?.content || ''
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      showcase    = JSON.parse(clean)

    } catch (e) {
      console.warn('Kimi fallback:', e)
      source   = 'fallback'
      showcase = _buildFallback(demo)
    }

    showcase.generated_at = new Date().toISOString()
    showcase.source        = source

    // Guardar en generated_demos.showcase_content
    const { error: saveErr } = await sb
      .from('generated_demos')
      .update({ showcase_content: showcase })
      .eq('slug', slug)

    if (saveErr) console.error('Save error:', saveErr)

    return json({ slug: demo.slug, showcase })

  } catch (err) {
    console.error('generate-showcase-content error:', err)
    return json({ error: 'Error interno' }, 500)
  }
})

function _buildFallback(demo: Record<string, string>): Record<string, string> {
  return {
    headline: `${demo.doctor_name} ya tiene su identidad médica premium.`,
    caption:  `${demo.specialty} de alto nivel, ahora con presencia digital premium.\n"${demo.hero_title}"\n\n→ Genera el tuyo en segundos: citadoc.lat/generar`,
    story_text: `¿Tu práctica se ve así de premium?\nCitaDoc genera tu sitio médico con IA.\ncitadoc.lat/generar`,
    hashtags: '#medicinapremium #citadoc #medicinadigital #medico #saludpremium #identidadmedica',
  }
}
