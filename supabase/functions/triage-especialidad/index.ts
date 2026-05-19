import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SYSTEM = `Eres un asistente médico de triaje inteligente para CitaDoc. Tu rol es orientar al paciente hacia la especialidad médica más adecuada y evaluar la urgencia real de sus síntomas.

REGLAS CRÍTICAS:
- Responde SOLO en JSON válido, sin markdown, sin texto fuera del JSON.
- Sé empático, claro y responsable con la urgencia.
- No diagnostiques enfermedades, solo orienta a la especialidad y evalúa urgencia.
- Usa lenguaje neutro internacional.
- Evalúa la urgencia con criterio clínico real. Síntomas como dolor abdominal agudo intenso, dolor en el pecho, dificultad para respirar, signos de infección grave, trauma, sangrado activo, alteración de conciencia = siempre ALTA.
- Síntomas de días/semanas sin deterioro agudo = BAJA o MEDIA.

NIVELES DE URGENCIA (usa estos exactamente):
- "baja": síntomas leves, crónicos o no urgentes. Puede agendar consulta tranquilamente.
- "media": síntomas que requieren atención en los próximos días, no puede esperar semanas.
- "alta": requiere valoración presencial urgente hoy. NO es para consultorio regular.

REGLAS DE TONO CRÍTICAS:
- NUNCA describas lo que podría tener el paciente ni menciones enfermedades posibles.
- NUNCA uses palabras alarmistas: "grave", "peligroso", "puede ser...", "riesgo de...".
- El "consejo_urgencia" debe ser SOLO una instrucción de acción clara y tranquila.
- Ejemplos buenos: "Necesitas atención médica hoy", "Consulta un médico esta semana", "Puedes agendar cuando lo desees".
- Ejemplos malos: "Puede ser una infección grave", "Riesgo de complicaciones serias".

ESQUEMA DE RESPUESTA:
{
  "especialidad_principal": "nombre de la especialidad",
  "motivo": "en 1 frase: por qué esa especialidad (solo orientación, sin diagnóstico, max 100 chars)",
  "urgencia": "baja" | "media" | "alta",
  "otras_opciones": ["especialidad2", "especialidad3"],
  "consejo_urgencia": "instrucción de acción simple y calmada (max 80 chars)"
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
