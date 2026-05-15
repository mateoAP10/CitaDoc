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

const SYSTEM_PROMPT = `Eres un asistente clínico experto en medicina interna y análisis longitudinal de pacientes.
Tu tarea: analizar el historial clínico completo de un paciente y generar un resumen médico estructurado.

REGLAS:
- Responde SOLO con JSON válido. Sin markdown. Sin texto fuera del JSON.
- Sé conciso pero clínicamente preciso. Máximo 3 oraciones por sección.
- Usa terminología médica apropiada pero comprensible.
- Si no hay datos suficientes, usa "" para esa sección.
- NO inventes datos ni inferencias sin evidencia en el historial.

ESQUEMA DE RESPUESTA:
{
  "resumen": "Resumen narrativo de 2-3 oraciones del perfil clínico general del paciente.",
  "condiciones_activas": ["lista de condiciones/diagnósticos activos o recurrentes"],
  "medicamentos_frecuentes": ["medicamentos más prescritos en el historial"],
  "patrones": "Patrones clínicos observados (recurrencias, progresión, respuesta terapéutica).",
  "alertas": ["señales de alerta o aspectos a monitorear"],
  "ultima_evolucion": "Descripción de la evolución reciente del paciente.",
  "recomendacion": "Recomendación clínica general basada en el historial.",
  "generated_at": "",
  "consultations_count": 0,
  "model": "moonshot-v1-8k"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { patient_id, medico_id, force_regen } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = await checkRateLimit('summary_generation', medico_id || null, ip)
    if (!rl.allowed) {
      return Response.json({ ok: false, error: rl.reason, retry_after: 60 }, { headers: cors, status: 429 })
    }
    if (!patient_id) return Response.json({ ok: false, error: 'patient_id required' }, { headers: cors, status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check cache (unless force_regen)
    if (!force_regen) {
      const { data: pac } = await supabase.from('pacientes').select('ai_summary_cache').eq('id', patient_id).single()
      if (pac?.ai_summary_cache && !pac.ai_summary_cache.invalidated) {
        return Response.json({ ok: true, summary: pac.ai_summary_cache, from_cache: true }, { headers: cors })
      }
    }

    // Load last 10 consultations
    const { data: consultas, error: cErr } = await supabase
      .from('consultas')
      .select('motivo, enfermedad_actual, examen_fisico, diagnostico, plan, imagenes, estudios, indicaciones, soap_jsonb, created_at, presion_arterial, frecuencia_cardiaca, temperatura, peso')
      .eq('paciente_id', patient_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (cErr) return Response.json({ ok: false, error: cErr.message }, { headers: cors, status: 500 })
    if (!consultas || consultas.length < 3) {
      return Response.json({ ok: false, error: 'insufficient_data', min_required: 3, current: consultas?.length||0 }, { headers: cors })
    }

    // Build clinical context
    const context = consultas.map((con, i) => {
      const fecha = new Date(con.created_at).toLocaleDateString('es', {day:'numeric',month:'short',year:'numeric'})
      const soap = con.soap_jsonb as Record<string,unknown>|null
      const diags = soap ? (soap.assessment as Record<string,unknown>)?.diagnoses : null
      const meds  = soap ? (soap.plan as Record<string,unknown>)?.medications : null
      return `--- Consulta ${i+1} (${fecha}) ---
Motivo: ${con.motivo||''}
${con.enfermedad_actual ? 'Enfermedad actual: '+con.enfermedad_actual : ''}
${con.examen_fisico ? 'Examen: '+con.examen_fisico : ''}
Diagnóstico: ${con.diagnostico || (diags ? JSON.stringify(diags) : '')}
Tratamiento: ${con.plan || (meds ? JSON.stringify(meds) : '')}
${con.indicaciones ? 'Indicaciones: '+con.indicaciones : ''}
${(con.presion_arterial||con.temperatura) ? 'Vitales: PA '+con.presion_arterial+' FC '+con.frecuencia_cardiaca+' T '+con.temperatura+' Peso '+con.peso : ''}`
    }).join('\n\n')

    const apiKey = Deno.env.get('KIMI_API_KEY')
    if (!apiKey) return Response.json({ ok: false, error: 'KIMI_API_KEY not set' }, { headers: cors, status: 500 })

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analiza el siguiente historial clínico y genera el resumen:\n\n${context}` }
        ]
      })
    })

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return Response.json({ ok: false, error: 'Kimi: ' + err.slice(0,200) }, { headers: cors, status: 500 })
    }

    const kimiData = await kimiRes.json()
    const content = kimiData.choices?.[0]?.message?.content || ''

    let summary: Record<string,unknown> = {}
    try { summary = JSON.parse(content) }
    catch { const m = content.match(/\{[\s\S]+\}/); if(m) summary = JSON.parse(m[0]); }

    summary.generated_at = new Date().toISOString()
    summary.consultations_count = consultas.length
    summary.model = KIMI_MODEL
    summary.invalidated = false

    // Save to cache
    await supabase.from('pacientes').update({ ai_summary_cache: summary }).eq('id', patient_id)

    return Response.json({ ok: true, summary, from_cache: false }, { headers: cors })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { headers: cors, status: 500 })
  }
})
