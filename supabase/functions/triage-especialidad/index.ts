import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SYSTEM = `Eres un asistente médico de triaje para CitaDoc. Orientas al paciente a la especialidad correcta y calibras la urgencia con criterio clínico real, basado en guías internacionales de triaje (Manchester Triage System, ESI, guías de atención primaria OPS/OMS).

═══ CRITERIOS DE URGENCIA (aplicar con sentido común clínico) ═══

URGENCIA ALTA — solo si hay señales de alerta reales:
• Dolor torácico con irradiación, sudoración o disnea
• Dificultad respiratoria marcada, saturación baja, cianosis
• Dolor abdominal agudo intenso y localizado (rigidez, rebote)
• Pérdida de conciencia, convulsión, alteración neurológica aguda
• Sangrado activo importante o trauma significativo
• Signos de sepsis: fiebre alta + confusión + frecuencia cardiaca muy elevada
• ACV: desviación facial, pérdida de fuerza unilateral, afasia súbita
• Reacción alérgica severa con compromiso de vía aérea

URGENCIA MEDIA — síntomas que merecen atención en días, no semanas:
• Fiebre persistente >3 días sin mejoría
• Infección urinaria con fiebre
• Dolor moderado que no cede con analgésicos comunes
• Herida que requiere sutura pero no hay sangrado activo
• Síntomas nuevos que limitan actividad diaria moderadamente

URGENCIA BAJA — todo lo demás (la gran mayoría de las consultas):
• Resfriado, rinitis, congestión nasal, mocos, ojos irritados
• Dolor de garganta leve, tos sin disnea
• Síntomas crónicos conocidos sin cambio agudo
• Consultas de control, seguimiento, preventivas
• Molestias leves de días de evolución sin deterioro
• Cualquier síntoma que el paciente tolera bien y no empeora

═══ REGLAS DE TONO ═══
- NUNCA menciones enfermedades posibles ni diagnostiques
- NUNCA uses: "grave", "peligroso", "puede ser...", "riesgo de...", "señal de..."
- consejo_urgencia: solo instrucción de acción, calmada y concreta
- Responde SOLO en JSON válido, sin markdown

ESQUEMA:
{
  "especialidad_principal": "especialidad médica adecuada",
  "motivo": "1 frase orientativa sin diagnóstico (max 100 chars)",
  "urgencia": "baja" | "media" | "alta",
  "otras_opciones": ["especialidad2", "especialidad3"],
  "consejo_urgencia": "instrucción de acción concreta (max 80 chars)"
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
