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

// Registro extensible de comandos soportados por el asistente de voz.
// Para agregar un comando nuevo: sumar una entrada aquí (el frontend
// mantiene su propio registro paralelo de handlers, ver _vaActions
// en citadoc-dashboard.html). No hace falta tocar el prompt más que esto.
const ACTIONS: Record<string, string> = {
  resumen:     'Enviar el resumen clínico de la última consulta al paciente',
  receta:      'Enviar la receta / medicamentos de la última consulta al paciente',
  laboratorio: 'Enviar la orden de laboratorio de la última consulta al paciente',
  imagenes:    'Enviar la orden de estudios de imagen de la última consulta al paciente'
}

const SYSTEM_PROMPT = `Eres el parser de intención del asistente de voz de CitaDoc, una app para médicos.
El médico da un comando de voz en español latinoamericano dentro de la sección Pacientes.
Tu única tarea: identificar qué acción o acciones quiere ejecutar, sobre qué paciente, y si
está pidiendo REENVIAR algo ya documentado o DICTANDO contenido clínico nuevo. Todo en JSON.

ACCIONES VÁLIDAS (usa exactamente estas claves dentro de "actions"):
${Object.entries(ACTIONS).map(([k, v]) => `- "${k}": ${v}`).join('\n')}

"mode" — DOS casos, no los confundas:
- "send_existing": el médico solo pide reenviar/mandar un documento que YA existe, sin
  dictar contenido médico nuevo. Ej: "Envíale la receta a Juan", "Mándale el resumen a Ana".
- "compose": el médico está DICTANDO contenido clínico nuevo y concreto (nombres de
  medicamentos, dosis, frecuencias, nombres de exámenes de laboratorio o imagen) que
  todavía no está guardado. Ej: "Envíale a Juan cefalexina 500, 1 cada 12 horas por 7
  días", "A Ana ponle glucemia, urea y creatinina en laboratorio". En este modo "resumen"
  nunca aplica (el resumen no se dicta, se genera solo) — no lo incluyas en "actions".
Un comando puede pedir más de una acción a la vez (ej: "la receta y las imágenes de Juan"),
por eso "actions" es una LISTA. No mezcles ambos modos en el mismo comando: si hay
contenido clínico dictado en cualquier parte del comando, todo el comando es "compose".

REGLAS:
- Responde SOLO con JSON válido, sin markdown, sin explicaciones.
- "actions": array con una o más claves de la lista de arriba, en el orden que las dijo el médico.
  Si el comando no calza con ninguna acción válida, "actions" debe ser un array vacío [].
- Nunca repitas la misma clave dos veces en "actions".
- "paciente_query": el nombre del paciente tal como lo dijo el médico (texto crudo, sin normalizar).
- "confidence": 0.0-1.0, tu certeza de que interpretaste bien modo + acción(es) + nombre.
  0.9+ = comando claro y sin ambigüedad
  0.6-0.89 = algo parcialmente ambiguo
  <0.6 = muy incierto, mejor actions: []
- Si no se menciona ningún paciente, "paciente_query" debe ser "".
- Nunca inventes un paciente ni una acción que no esté en la lista.

ESQUEMA DE RESPUESTA:
{
  "actions": ["receta"],
  "mode": "send_existing",
  "paciente_query": "",
  "confidence": 0.0
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const t0 = Date.now()

  try {
    const { text, medico_id } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = await checkRateLimit('voice_assistant_intent', medico_id || null, ip)
    if (!rl.allowed) {
      return Response.json({ ok: false, error: rl.reason, retry_after: 60 }, { headers: cors, status: 429 })
    }
    if (!text) return Response.json({ ok: false, error: 'text required' }, { headers: cors, status: 400 })

    const apiKey = Deno.env.get('KIMI_API_KEY')
    if (!apiKey) return Response.json({ ok: false, error: 'KIMI_API_KEY not set' }, { headers: cors, status: 500 })

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Comando de voz: "${text}"` }
        ]
      })
    })

    const latency = Date.now() - t0

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return Response.json({ ok: false, error: 'Kimi error: ' + err.slice(0, 200) }, { headers: cors, status: 500 })
    }

    const kimiData = await kimiRes.json()
    const content  = kimiData.choices?.[0]?.message?.content || ''
    const usage    = kimiData.usage || {}

    let intent: { actions?: unknown; mode?: unknown; paciente_query?: string; confidence?: number } = {}
    try {
      intent = JSON.parse(content)
    } catch {
      const match = content.match(/\{[\s\S]+\}/)
      if (match) intent = JSON.parse(match[0])
      else return Response.json({ ok: false, error: 'JSON parse failed', raw: content.slice(0, 500) }, { headers: cors })
    }

    // Sanea: solo claves válidas, sin duplicados, orden preservado.
    const rawActions = Array.isArray(intent.actions) ? intent.actions : []
    const seen = new Set<string>()
    let actions = rawActions.filter((a: unknown): a is string => {
      if (typeof a !== 'string' || !(a in ACTIONS) || seen.has(a)) return false
      seen.add(a)
      return true
    })
    const mode = intent.mode === 'compose' ? 'compose' : 'send_existing'
    // "resumen" nunca se dicta -- si el modelo lo mete en compose por error, se descarta.
    if (mode === 'compose') actions = actions.filter(a => a !== 'resumen')
    const confidence = typeof intent.confidence === 'number' ? intent.confidence : 0

    // Log de uso (best effort, no bloquea la respuesta)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('ai_usage_logs').insert({
        doctor_id:       medico_id || null,
        feature:         'voice_assistant_intent',
        model:           KIMI_MODEL,
        input_tokens:    usage.prompt_tokens || 0,
        output_tokens:   usage.completion_tokens || 0,
        pricing_version: '2026-05',
        latency_ms:      latency,
        success:         true
      })
    } catch (_) { /* non-blocking */ }

    return Response.json({
      ok: true,
      actions,
      mode,
      paciente_query: intent.paciente_query || '',
      confidence: actions.length ? confidence : Math.min(confidence, 0.4),
      latency_ms: latency
    }, { headers: cors })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { headers: cors, status: 500 })
  }
})
