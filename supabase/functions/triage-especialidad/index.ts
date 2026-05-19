import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

// Stop-words to filter before FTS keyword extraction
const STOP = new Set([
  'tengo','siento','desde','hace','dias','horas','mucho','poco','algo','muy','para',
  'como','esta','este','esto','pero','tiene','tenia','llevo','lleva','sigo','cada',
  'noche','tarde','mañana','antes','ahora','cuando','donde','quien','tanto','tambien',
  'ademas','aunque','porque','sobre','entre','hacia','hasta','desde','durante',
])

function extractKeywords(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOP.has(w))
  )].slice(0, 12)
}

async function fetchGuidelines(sintomas: string): Promise<Array<{titulo: string; fuente: string; anio: number}>> {
  const keywords = extractKeywords(sintomas)
  if (keywords.length === 0) return []

  const query = keywords.join(' | ')

  const { data, error } = await sb
    .from('clinical_guidelines')
    .select('titulo, fuente, anio, contenido, tags')
    .textSearch('contenido', query, { type: 'plain', config: 'simple' })
    .limit(3)

  if (error) {
    console.error('guidelines fetch error:', error.message)
    return []
  }

  return (data || []).map(g => ({ titulo: g.titulo, fuente: g.fuente, anio: g.anio, contenido: g.contenido }))
}

function buildSystem(guidelines: Array<{titulo: string; fuente: string; anio: number; contenido: string}>): string {
  const guiasSection = guidelines.length > 0
    ? `\n\n═══ GUÍAS CLÍNICAS DE REFERENCIA ═══\n${guidelines.map((g, i) =>
        `[${i+1}] ${g.titulo} (${g.fuente}, ${g.anio})\n${g.contenido}`
      ).join('\n\n')}\n\nUsa las guías clínicas provistas como referencia principal. En "referencias" incluye SOLO las guías que efectivamente usaste para tu evaluación (1-3 máximo).`
    : ''

  return `Eres un asistente médico de triaje para CitaDoc. Orientas al paciente a la especialidad correcta y calibras la urgencia con criterio clínico real, basado en guías internacionales de triaje (Manchester Triage System, ESI, guías de atención primaria OPS/OMS).${guiasSection}

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

═══ REGLAS DE TONO Y CONSEJO ═══
- NUNCA menciones enfermedades posibles ni diagnostiques
- NUNCA uses: "grave", "peligroso", "puede ser...", "riesgo de...", "señal de..."
- Responde SOLO en JSON válido, sin markdown

consejo_urgencia: incluye SIEMPRE una acción práctica inmediata + la recomendación de atención.
Máximo 120 chars. Debe sonar humano, calmado y útil.

Ejemplos de BUENOS consejos por situación:
• Mocos, tos leve, ojos irritados → "Descansa, mantente hidratado y agenda consulta cuando lo desees"
• Fiebre varios días sin bajar → "Toma antitérmicos, monitorea la temperatura y consulta esta semana"
• Dolor abdominal intenso + fiebre + vómitos + diarrea → "Mantente hidratado con líquidos frecuentes y acude a urgencias hoy para valoración"
• Dolor en el pecho con sudoración → "Llama a emergencias o ve a urgencias de inmediato, no manejes solo"
• Dolor de cabeza crónico leve → "Lleva un registro de los episodios y agenda consulta con calma"
• Infección urinaria con ardor → "Bebe abundante agua y consulta un médico esta semana"
• Mareos ocasionales sin otros síntomas → "Evita movimientos bruscos y agenda consulta esta semana"

ESQUEMA DE RESPUESTA (JSON estricto, sin markdown):
{
  "especialidad_principal": "especialidad médica adecuada",
  "motivo": "1 frase orientativa sin diagnóstico (max 100 chars)",
  "urgencia": "baja" | "media" | "alta",
  "otras_opciones": ["especialidad2", "especialidad3"],
  "consejo_urgencia": "acción práctica + recomendación de atención (max 120 chars)"
}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { sintomas } = await req.json()
    if (!sintomas || sintomas.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Describe más tus síntomas' }), { status: 400, headers: cors })
    }

    // Fetch relevant clinical guidelines in parallel with (almost) nothing — single DB call
    const guidelines = await fetchGuidelines(sintomas)

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('KIMI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: buildSystem(guidelines) },
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
