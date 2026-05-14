import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const SYSTEM_PROMPT = `Eres un asistente clínico médico especializado en estructurar consultas médicas en español latinoamericano.
Tu tarea: extraer de texto libre de dictado médico una estructura SOAP clínica completa en JSON.

REGLAS:
- Responde SOLO con JSON válido, sin markdown, sin explicaciones.
- Si un campo no está en el texto, usa "" o [].
- Para diagnósticos, sugiere código CIE-10 si puedes inferirlo.
- Para medicamentos, extrae dosis y frecuencia si están mencionados.
- certainty: "probable" | "confirmado" | "descartado"
- response: siempre "pendiente" para medicamentos nuevos.

ESQUEMA DE RESPUESTA:
{
  "schema_version": "v1",
  "subjective": {
    "chief_complaint": "",
    "history_present_illness": ""
  },
  "objective": {
    "physical_exam": "",
    "vitals": { "bp": "", "hr": "", "temp": "", "wt": "" }
  },
  "assessment": {
    "diagnoses": [
      { "cie10": "", "label": "", "certainty": "probable" }
    ]
  },
  "plan": {
    "medications": [
      { "drug": "", "dose": "", "route": "VO", "frequency": "", "duration_days": 0, "response": "pendiente" }
    ],
    "labs": [{ "name": "" }],
    "images": [{ "name": "" }],
    "instructions": ""
  },
  "metadata": {
    "created_with": "voice",
    "raw_text": ""
  }
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { text, medico_id } = await req.json()
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
          { role: 'user', content: `Extrae la estructura SOAP de este dictado médico:\n\n"${text}"` }
        ]
      })
    })

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return Response.json({ ok: false, error: 'Kimi error: ' + err.slice(0, 200) }, { headers: cors, status: 500 })
    }

    const kimiData = await kimiRes.json()
    const content = kimiData.choices?.[0]?.message?.content || ''

    let soap: Record<string, unknown> = {}
    try {
      soap = JSON.parse(content)
    } catch {
      // Try to extract JSON from content if wrapped in markdown
      const match = content.match(/\{[\s\S]+\}/)
      if (match) soap = JSON.parse(match[0])
      else return Response.json({ ok: false, error: 'Could not parse Kimi JSON', raw: content.slice(0, 500) }, { headers: cors })
    }

    // Attach raw text to metadata
    if (soap.metadata && typeof soap.metadata === 'object') {
      (soap.metadata as Record<string, unknown>).raw_text = text
    }

    return Response.json({ ok: true, soap, model: KIMI_MODEL }, { headers: cors })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { headers: cors, status: 500 })
  }
})
