import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SYSTEM = `Eres un asistente médico de triaje inteligente para CitaDoc. Tu rol es orientar al paciente hacia la especialidad médica más adecuada basándote en sus síntomas o motivo de consulta.

REGLAS:
- Responde SOLO en JSON válido, sin markdown, sin texto fuera del JSON.
- Sé empático, claro y no alarmista.
- No diagnostiques enfermedades, solo orienta hacia la especialidad correcta.
- Usa lenguaje neutro internacional, evita términos locales.
- Si los síntomas son una emergencia, indícalo claramente en la respuesta.

ESQUEMA DE RESPUESTA:
{
  "especialidad_principal": "nombre de la especialidad",
  "motivo": "explicación breve en 1-2 frases de por qué esa especialidad (max 120 chars)",
  "urgencia": "normal" | "pronto" | "urgente",
  "otras_opciones": ["especialidad2", "especialidad3"],
  "mensaje_urgencia": "solo si urgencia=urgente, mensaje corto de acción inmediata"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { sintomas } = await req.json()
    if (!sintomas || sintomas.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Describe más tus síntomas' }), { status: 400, headers: cors })
    }

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('KIMI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Síntomas o motivo de consulta: "${sintomas.slice(0, 500)}"` }
        ]
      })
    })

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      console.error('kimi error:', err)
      return new Response(JSON.stringify({ error: 'ai_error' }), { status: 502, headers: cors })
    }

    const kimiData = await kimiRes.json()
    const raw = (kimiData.choices?.[0]?.message?.content || '').trim()

    let result
    try {
      const clean = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/```$/,'').trim()
      result = JSON.parse(clean)
    } catch {
      console.error('parse error:', raw)
      return new Response(JSON.stringify({ error: 'parse_error' }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true, ...result }), { headers: cors })

  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: cors })
  }
})
