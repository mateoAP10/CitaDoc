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

const SYSTEM_PROMPT = `Eres un asistente clínico médico especializado en estructurar consultas médicas en español latinoamericano.
Tu tarea: extraer de texto libre de dictado médico una estructura SOAP clínica completa en JSON.

REGLAS:
- Responde SOLO con JSON válido, sin markdown, sin explicaciones.
- Si un campo no está en el texto, usa "" o [].
- Para diagnósticos, sugiere código CIE-10 si puedes inferirlo.
- Para medicamentos, extrae dosis y frecuencia si están mencionados.
- certainty: "probable" | "confirmado" | "descartado"
- response: siempre "pendiente" para medicamentos nuevos.
- confidence: número 0.0-1.0 por campo/item según tu certeza de la extracción.
  0.95+ = mención explícita clara
  0.75-0.94 = mención implícita o parcial
  0.5-0.74 = inferencia
  <0.5 = muy incierto, mejor dejar vacío

ESQUEMA DE RESPUESTA (incluye confidence en cada item):
{
  "schema_version": "v1",
  "subjective": {
    "chief_complaint": "",
    "chief_complaint_confidence": 0.0,
    "history_present_illness": "",
    "history_confidence": 0.0
  },
  "objective": {
    "physical_exam": "",
    "physical_exam_confidence": 0.0,
    "vitals": { "bp": "", "hr": "", "temp": "", "wt": "" },
    "vitals_confidence": 0.0
  },
  "assessment": {
    "diagnoses": [
      { "cie10": "", "label": "", "certainty": "probable", "confidence": 0.0 }
    ]
  },
  "plan": {
    "medications": [
      { "drug": "", "dose": "", "route": "VO", "frequency": "", "duration_days": 0, "response": "pendiente", "confidence": 0.0 }
    ],
    "labs": [{ "name": "", "confidence": 0.0 }],
    "images": [{ "name": "", "confidence": 0.0 }],
    "instructions": "",
    "instructions_confidence": 0.0
  },
  "metadata": {
    "created_with": "voice",
    "raw_text": "",
    "overall_confidence": 0.0
  }
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const t0 = Date.now()

  try {
    const { text, medico_id, patient_id, consultation_id } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = await checkRateLimit('voice_extraction', medico_id || null, ip)
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
          { role: 'user', content: `Extrae la estructura SOAP de este dictado médico:\n\n"${text}"` }
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

    let soap: Record<string, unknown> = {}
    try {
      soap = JSON.parse(content)
    } catch {
      const match = content.match(/\{[\s\S]+\}/)
      if (match) soap = JSON.parse(match[0])
      else return Response.json({ ok: false, error: 'JSON parse failed', raw: content.slice(0, 500) }, { headers: cors })
    }

    // Attach raw text + timestamp
    if (soap.metadata && typeof soap.metadata === 'object') {
      const meta = soap.metadata as Record<string, unknown>
      meta.raw_text = text
      meta.extracted_at = new Date().toISOString()
    }

    // Log usage (best effort, non-blocking)
    const inputTokens  = usage.prompt_tokens || 0
    const outputTokens = usage.completion_tokens || 0

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('ai_usage_logs').insert({
        doctor_id:       medico_id || null,
        patient_id:      patient_id || null,
        consultation_id: consultation_id || null,
        feature:         'voice_extraction',
        model:           KIMI_MODEL,
        input_tokens:    inputTokens,
        output_tokens:   outputTokens,
        audio_seconds:   Math.round(text.split(' ').length / 2.5),
        pricing_version: '2026-05',
        latency_ms:      latency,
        success:         true
      })
    } catch (_) { /* non-blocking */ }

    return Response.json({
      ok: true,
      soap,
      model: KIMI_MODEL,
      latency_ms: latency,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens }
    }, { headers: cors })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { headers: cors, status: 500 })
  }
})
