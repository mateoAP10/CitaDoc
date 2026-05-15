import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SYSTEM_PROMPT = `Eres un experto en marketing médico premium para LATAM. Creas contenido de alto valor para médicos especialistas que quieren construir su presencia digital de manera elegante y profesional.

PRINCIPIOS DE CONTENIDO:
- Elegante y sofisticado, nunca genérico
- Empático con el paciente, no agresivamente vendedor
- Enfocado en confianza, expertise y experiencia del paciente
- Español latinoamericano moderno y fluido
- NUNCA uses "el mejor médico", "el más confiable" ni superlativos vacíos
- Máximo 2 emojis por caption, solo si aportan
- Máximo 4-5 hashtags relevantes al final si aplica
- Los captions deben ser variados: educativo, humanizador, sobre el proceso clínico, sobre la especialidad, sobre la experiencia del paciente

RESPONDE SOLO en JSON válido. Sin markdown. Sin texto fuera del JSON.

ESQUEMA:
{
  "captions": ["caption 1 completo", "caption 2", "caption 3", "caption 4", "caption 5"],
  "reel_hook": "frase de apertura impactante de 5-8 segundos para video",
  "email_subject": "asunto del email outbound",
  "email_body": "cuerpo del email en 3-4 párrafos cortos y directos",
  "cta": "llamado a la acción principal del perfil (15-25 palabras)"
}`

const TONE_MAP: Record<string, string> = {
  profesional: 'Profesional y confiable. Proyecta autoridad clínica sin distancia. Formal pero accesible.',
  cercano:     'Cálido y empático. Humaniza al médico. Cercano al paciente sin perder el profesionalismo.',
  moderno:     'Contemporáneo y dinámico. Lenguaje actual. Apela a pacientes digitales que valoran transparencia.'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const ip = req.headers.get('x-forwarded-for') || 'unknown'

    let doctorId: string | null = null
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await sb.auth.getUser()
      doctorId = user?.id || null
    } catch (_) {}

    const rl = await checkRateLimit('growth_content', doctorId, ip)
    if (!rl.allowed) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limit', reason: rl.reason }), { status: 429, headers: cors })
    }

    const { specialty, doctor_name, city, bio, tone = 'profesional' } = await req.json()

    if (!specialty || !doctor_name) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { status: 400, headers: cors })
    }

    const userPrompt = `Médico: Dr. ${doctor_name}
Especialidad: ${specialty}
Ciudad: ${city || 'Ecuador'}
Bio clínica: ${bio || 'Especialista con experiencia en consulta privada'}
Tono: ${TONE_MAP[tone] || TONE_MAP.profesional}

Genera contenido de marketing premium para este médico. Los 5 captions de Instagram deben ser variados en tema y enfoque.`

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KIMI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.82,
        max_tokens: 2200
      })
    })

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return new Response(JSON.stringify({ ok: false, error: 'kimi_error', detail: err }), { status: 502, headers: cors })
    }

    const kimiData = await kimiRes.json()
    const raw = (kimiData.choices?.[0]?.message?.content || '').trim()

    let content: any
    try {
      content = JSON.parse(raw)
    } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('invalid_json_response')
      content = JSON.parse(match[0])
    }

    if (!Array.isArray(content.captions) || content.captions.length < 3) {
      throw new Error('incomplete_response')
    }

    return new Response(JSON.stringify({ ok: true, content }), { headers: cors })

  } catch (e) {
    console.error('[growth-content]', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors })
  }
})
