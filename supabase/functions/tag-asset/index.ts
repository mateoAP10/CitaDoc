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

const VISION_PROMPT = `Analiza esta imagen de contenido médico/clínico y responde SOLO con JSON válido.

{
  "specialty": "traumatologia|cirugia|dermatologia|ginecologia|cardiologia|odontologia|pediatria|general",
  "mood": "aspiracional|educativo|clinico|lifestyle|antes-despues|branding|equipo",
  "asset_type": "consultorio|doctor-portrait|procedimiento|equipo-medico|resultado|logo-marca|lifestyle",
  "use_cases": ["carousel","reel_cover","ad","story","showcase"],
  "quality": "premium|bueno|regular",
  "description": "descripción en español de qué muestra la imagen en 1 oración",
  "suggested_hook": "gancho aspiracional de 8-10 palabras para usar con esta imagen"
}

Reglas:
- quality "premium" = composición profesional, iluminación excelente, branding claro
- quality "bueno" = foto clara y útil, composición normal
- quality "regular" = útil pero con limitaciones técnicas
- use_cases: lista los usos más apropiados para esta imagen en Instagram/Facebook
- Responde SOLO el JSON, sin texto adicional`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const { image_url, file_name } = body

    if (!image_url?.trim()) return json({ error: 'image_url es requerido' }, 400)

    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SVCKEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!

    const sb = createClient(SUPABASE_URL, SUPABASE_SVCKEY)

    let tags: Record<string, unknown>

    if (ANTHROPIC_KEY) {
      // Claude Vision — caso ideal para análisis de imágenes
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: image_url } },
              { type: 'text', text: VISION_PROMPT },
            ],
          }],
        }),
      })

      if (!res.ok) throw new Error(`Claude ${res.status}`)

      const data  = await res.json()
      const raw   = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      tags = JSON.parse(clean)

    } else {
      // Fallback sin Claude Vision
      tags = {
        specialty:      'general',
        mood:           'clinico',
        asset_type:     'consultorio',
        use_cases:      ['carousel', 'ad'],
        quality:        'bueno',
        description:    'Asset visual médico',
        suggested_hook: 'Tu práctica merece verse así',
      }
    }

    // Insertar en growth_assets
    const { data: asset, error } = await sb
      .from('growth_assets')
      .insert({
        image_url,
        file_name: file_name || image_url.split('/').pop(),
        tags_jsonb:  tags,
        specialty:   String(tags.specialty || 'general'),
        mood:        String(tags.mood || 'clinico'),
        asset_type:  String(tags.asset_type || ''),
        use_cases:   Array.isArray(tags.use_cases) ? tags.use_cases : [],
        quality:     String(tags.quality || 'bueno'),
      })
      .select('id, specialty, mood, quality')
      .single()

    if (error) throw error

    return json({ id: asset.id, tags, asset })

  } catch (err) {
    console.error('tag-asset error:', err)
    return json({ error: 'Error interno' }, 500)
  }
})
