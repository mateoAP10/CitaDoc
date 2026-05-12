import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ───────────────────────────────────────────
// CitaDoc AI Website Config Generator — Kimi Real
// Phase: production wiring + quality iteration
// ───────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// Contract: fields that MUST be present in the generated config
const REQUIRED_FIELDS = [
  'headline',
  'subheadline',
  'about_text',
  'cta_primary'
]

// ── KIMI API ──
// Testing both endpoints — .cn (China) and .ai (International)
const KIMI_BASE_URL = 'https://api.moonshot.ai/v1'
const KIMI_MODEL = 'moonshot-v1-8k'

interface KimiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface KimiResponse {
  choices?: Array<{
    message?: { content?: string }
    finish_reason?: string
  }>
  error?: { message: string; type: string }
}

function attachLogs(err: Error, logs: string[]) {
  ;(err as any).diagnosticLogs = logs
  return err
}

async function callKimiAPI(messages: KimiMessage[]): Promise<Record<string, unknown>> {
  const t0 = Date.now()
  const apiKey = Deno.env.get('KIMI_API_KEY')
  if (!apiKey) {
    throw new Error('KIMI_API_KEY not configured')
  }

  const endpoint = `${KIMI_BASE_URL}/chat/completions`
  const maskedKey = apiKey.length > 12
    ? apiKey.slice(0, 8) + '...' + apiKey.slice(-4)
    : '***'

  const payload = {
    model: KIMI_MODEL,
    messages,
    temperature: 1,
    max_tokens: 2000
    // Note: response_format removed — reasoning consumes tokens, keep output short
  }

  const logs: string[] = []
  logs.push(`[KIMI DIAGNOSTIC] Endpoint: ${endpoint}`)
  logs.push(`[KIMI DIAGNOSTIC] Model: ${KIMI_MODEL}`)
  logs.push(`[KIMI DIAGNOSTIC] Headers: ${JSON.stringify({
    'Authorization': `Bearer ${maskedKey}`,
    'Content-Type': 'application/json'
  })}`)
  logs.push(`[KIMI DIAGNOSTIC] Payload length: ${JSON.stringify(payload).length} chars`)
  logs.push(`[KIMI DIAGNOSTIC] KIMI_API_KEY length: ${apiKey.length}`)
  logs.push(`[KIMI DIAGNOSTIC] KIMI_API_KEY starts with: ${apiKey.slice(0, 4)}`)

  const fetchT0 = Date.now()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const fetchT1 = Date.now()
  logs.push(`[KIMI DIAGNOSTIC] Moonshot HTTP status: ${res.status}`)
  logs.push(`[KIMI DIAGNOSTIC] Moonshot response headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}`)
  logs.push(`[KIMI DIAGNOSTIC] Moonshot fetch time: ${fetchT1 - fetchT0}ms`)

  const rawText = await res.text()
  logs.push(`[KIMI DIAGNOSTIC] Moonshot raw response (first 3000 chars): ${rawText.slice(0, 3000)}`)

  // Print all logs to console for Supabase Functions logs viewer
  logs.forEach(l => console.log(l))

  if (!res.ok) {
    throw attachLogs(new Error(`Kimi API ${res.status}: ${rawText}`), logs)
  }

  let data: KimiResponse
  try {
    data = JSON.parse(rawText)
  } catch (e) {
    throw attachLogs(new Error(`Kimi returned non-JSON: ${rawText.slice(0, 500)}`), logs)
  }

  if (data.error) {
    throw attachLogs(new Error(`Kimi error: ${data.error.message}`), logs)
  }

  logs.push(`[KIMI DIAGNOSTIC] Choices count: ${data.choices?.length || 0}`)
  logs.push(`[KIMI DIAGNOSTIC] Finish reason: ${data.choices?.[0]?.finish_reason || 'N/A'}`)

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    logs.push(`[KIMI DIAGNOSTIC] Full choices array: ${JSON.stringify(data.choices)}`)
    throw attachLogs(new Error('Kimi returned empty content'), logs)
  }

  logs.push(`[KIMI DIAGNOSTIC] Content length: ${content.length} chars`)
  logs.push(`[KIMI DIAGNOSTIC] Content preview (first 500 chars): ${content.slice(0, 500)}`)

  // Parse JSON from response
  try {
    const parsed = JSON.parse(content)
    return parsed
  } catch (_e) {
    // Try extracting JSON from markdown code block
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch (_e2) {
        throw attachLogs(new Error('Kimi markdown JSON block is invalid'), logs)
      }
    }
    throw attachLogs(new Error('Kimi response is not valid JSON. Raw: ' + content.slice(0, 800)), logs)
  }
}

// ── PROMPT BUILDER ──
function buildSystemPrompt(): string {
  return `Eres copywriter senior de CitaDoc, agencia de branding médico premium.
REGLAS:
1. Devuelve SOLO JSON válido. Sin markdown ni explicaciones.
2. NUNCA uses clichés: "su salud es nuestra prioridad", "atención de calidad", "profesional comprometido", "experiencia y dedicación".
3. Cada médico debe sentirse ÚNICO. Storytelling, detalles específicos, diferenciación real.
4. Tono: elegante, médico, humano, premium. NO corporativo.
5. Español neutro (Latinoamérica).

JSON requerido:
{
  "headline": "máx 80 chars, con nombre del doctor, sin adjetivos vacíos",
  "subheadline": "1-2 oraciones, claridad de valor",
  "about_text": "2-3 párrafos cortos. Narrativa del doctor. Por qué eligió esta especialidad. Momentos clave.",
  "philosophy": "1 frase poderosa, tipo quote",
  "doctor_story": "1 párrafo. Origen de su vocación. Un momento específico.",
  "differentiators": ["4-5 ventajas concretas, no genéricas"],
  "treatment_approach": "1 párrafo. Metodología específica. Herramientas o técnicas.",
  "patient_experience": "1 párrafo. Sensaciones del paciente, no características.",
  "tone": "cercania-humana | elegancia-premium | confianza-clinica | innovacion-tecnica",
  "services": [{"t":"nombre","d":"descripción","i":"emoji"}],
  "cta_primary": "2-3 palabras",
  "cta_final": "1 frase emotiva para la sección CTA final (max 60 chars)",
  "seo_title": "title optimizado",
  "seo_description": "meta description, 150-160 chars"
}`
}

function buildUserPrompt(medico: Record<string, unknown>, userPrompt: string, perception: string): string {
  const nombre = `${medico.titulo || 'Dr.'} ${medico.nombre || ''} ${medico.apellido || ''}`.trim()
  const esp = (medico.especialidades as string[] || [])[0] || ''
  const ciudad = (medico.ciudad as string) || ''
  const anos = (medico.anos_experiencia as string) || ''
  const bio = (medico.bio as string) || ''

  const parts: string[] = []
  parts.push(`MÉDICO: ${nombre}`)
  parts.push(`ESPECIALIDAD: ${esp}`)
  if (ciudad) parts.push(`CIUDAD: ${ciudad}`)
  if (anos) parts.push(`EXPERIENCIA: ${anos} años`)
  if (bio) parts.push(`BIO: ${bio}`)
  parts.push(`TONO: ${perception || 'cercania-humana'}`)
  if (userPrompt) parts.push(`BRIEF: ${userPrompt}`)

  return parts.join('\n') + `\n\nGenera el JSON de identidad web médica premium. Headline con nombre. Differentiators específicos de ${esp}. Treatment_approach con técnicas reales. Patient_experience evocando sensaciones.`
}

// ── MOCK FALLBACK (testing sin API key) ──
// Content maps by specialty for realistic differentiation
const SPECIALTY_CONTENT: Record<string, Record<string, unknown>> = {
  traumatologia: {
    philosophy: '"No solo reparo huesos. Restauro la confianza de moverse sin miedo."',
    treatment_approach: 'Evaluación biomecánica completa antes de cualquier intervención. Combino cirugía artroscópica mínimamente invasiva con rehabilitación funcional progresiva. Cada tratamiento se diseña sobre el movimiento real del paciente, no sobre estadísticas genéricas.',
    patient_experience: 'Llegas con dolor que limita tu vida. En la primera consulta entendemos exactamente qué movimiento te falla. Te explicamos tu diagnóstico con imágenes claras. El tratamiento no termina cuando sanas: te enseñamos a prevenir que vuelva.',
    differentiators: [
      'Cirugía artroscópica con recuperación acelerada',
      'Análisis biomecánico digital de tu movimiento',
      'Rehabilitación deportiva integrada al tratamiento',
      'Seguimiento post-operatorio sin costo adicional'
    ]
  },
  cirugia: {
    philosophy: '"Cada intervención es una decisión que cambia una vida. No opero por rutina: opero con propósito."',
    treatment_approach: 'Cirugía con enfoque en seguridad del paciente y recuperación acelerada. Evaluación pre-operatoria exhaustiva, técnica mínimamente invasiva cuando es posible, y seguimiento post-operatorio estricto. Cada decisión quirúrgica se discute con el paciente hasta que entiende exactamente qué va a pasar.',
    patient_experience: 'Venís con una indicación quirúrgica que puede asustar. En la primera consulta te explicamos el porqué, el cómo y el qué esperar después. No hay sorpresas: sabés exactamente tu recuperación paso a paso.',
    differentiators: [
      'Evaluación pre-operatoria exhaustiva y personalizada',
      'Técnicas mínimamente invasivas cuando la indicación lo permite',
      'Recuperación acelerada con protocolos de vanguardia',
      'Seguimiento post-operatorio estricto sin costo adicional'
    ]
  },
  cardiologia: {
    philosophy: '"El corazón no es una bomba. Es el ritmo de una vida."',
    treatment_approach: 'Cardiología de precisión basada en imagen avanzada y biomarcadores. No medicamos síntomas: identificamos el riesgo real de cada paciente con estudios personalizados. Prevención primaria con seguimiento de por vida.',
    patient_experience: 'Te escuchamos antes de conectarte a ningún aparato. Tu historia familiar importa tanto como tu electrocardiograma. Cada resultado te lo explicamos con calma. Salís sabiendo exactamente dónde estás y qué hacer.',
    differentiators: [
      'Evaluación de riesgo cardiovascular con biomarcadores',
      'Ecocardiograma 3D de última generación',
      'Programa de prevención primaria personalizada',
      'Seguimiento remoto continuo del ritmo cardíaco'
    ]
  },
  dermatologia: {
    philosophy: '"La piel cuenta lo que el paciente no puede expresar. Mi trabajo es escucharla."',
    treatment_approach: 'Dermatología integral que une diagnóstico clínico preciso con tratamientos estéticos sutiles. No transformamos rostros: recuperamos la piel que la enfermedad o el tiempo te quitaron. Cada protocolo se ajusta a tu fototipo y estilo de vida.',
    patient_experience: 'Te miramos a los ojos antes que a tu piel. Entendemos que venís por una lesión pero también por recuperar confianza. Cada tratamiento se explica con honestidad: qué esperar, cuánto tiempo, qué resultado real es posible.',
    differentiators: [
      'Diagnóstico dermatoscópico digital con IA asistida',
      'Tratamientos estéticos con resultados naturales',
      'Manejo integral de enfermedades autoinmunes de piel',
      'Protocolos personalizados por fototipo y edad'
    ]
  },
  ginecologia: {
    philosophy: '"Acompañar a una mujer en su salud es un privilegio que no se improvisa."',
    treatment_approach: 'Ginecología de vanguardia con enfoque en salud reproductiva integral. Desde la prevención oncológica hasta la fertilidad, cada etapa de la vida de la mujer merece un protocolo diferente. Tecnología mínimamente invasiva y diagnóstico temprano.',
    patient_experience: 'Encontrás un espacio donde tus preocupaciones no se minimizan. Te explicamos cada estudio en tu idioma. El tratamiento se ajusta a tu vida real, no a un manual. Te sentís escuchada, no procesada.',
    differentiators: [
      'Salud reproductiva integral en todas las etapas',
      'Cirugía ginecológica mínimamente invasiva',
      'Prevención oncológica con marcadores avanzados',
      'Acompañamiento emocional integrado al tratamiento'
    ]
  },
  neurologia: {
    philosophy: '"El cerebro es el órgano más humano que tenemos. Tratarlo exige precisión y empatía."',
    treatment_approach: 'Neurología clínica con soporte de neuroimagen avanzada y neurofisiología. No nos quedamos en el diagnóstico: diseñamos planes de rehabilitación neurológica activa. Cada paciente es un rompecabezas que resolvemos con paciencia.',
    patient_experience: 'Llegás con miedo. Te escuchamos sin prisa. Hacemos los estudios necesarios, no más. Te explicamos el diagnóstico con palabras que entendás. El tratamiento es un camino que recorremos juntos, con seguimiento constante.',
    differentiators: [
      'Diagnóstico neurológico con neuroimagen de alta resolución',
      'Rehabilitación neurológica personalizada y activa',
      'Manejo integral de migraña y cefaleas crónicas',
      'Evaluación cognitiva con protocolos estandarizados'
    ]
  },
  rehabilitacion: {
    philosophy: '"La recuperación no es volver a antes. Es llegar mejor de lo que estabas."',
    treatment_approach: 'Fisioterapia de especialidad basada en evidencia. Combinamos terapia manual avanzada, ejercicio terapéutico progresivo y tecnología de rehabilitación. Cada sesión tiene un objetivo medible. No vendemos sesiones: vendemos resultados.',
    patient_experience: 'Tu primera evaluación dura más que una consulta normal porque necesitamos entender TODO tu movimiento. Cada sesión te explicamos qué hacemos y por qué. Ves tu progreso en números. Al final no solo sanás: aprendés a cuidarte solo.',
    differentiators: [
      'Evaluación funcional completa en primera visita',
      'Terapia manual avanzada combinada con ejercicio terapéutico',
      'Recuperación post-quirúrgica con protocolos específicos',
      'Tecnología de rehabilitación: ondas de choque, láser, electroestimulación'
    ]
  },
  pediatria: {
    philosophy: '"Cuidar niños es cuidar el futuro. Y eso no admite mediocridad."',
    treatment_approach: 'Pediatría integral con enfoque en desarrollo infantil y prevención. No solo tratamos enfermedades: acompañamos el crecimiento de tu hijo con seguimiento de hitos del desarrollo. Vacunación, nutrición, sueño y neurodesarrollo en un solo lugar.',
    patient_experience: 'Tu hijo entra al consultorio y se siente cómodo. Juguetes, colores, tiempo. Nos tomamos el tiempo que necesita. Te explicamos todo sin tecnicismos. Salís con un plan claro y un número de WhatsApp para dudas.',
    differentiators: [
      'Pediatría integral: crecimiento, nutrición, neurodesarrollo',
      'Seguimiento de hitos del desarrollo con herramientas estandarizadas',
      'Vacunación con protocolos internacionales',
      'Línea directa de WhatsApp para urgencias pediátricas'
    ]
  },
  default: {
    philosophy: '"La medicina no es solo ciencia: es la decisión de estar presente en el momento que alguien más lo necesita."',
    treatment_approach: 'Atención médica personalizada que comienza con una escucha genuina. No tratamos síntomas aislados: entendemos al paciente completo. Cada consulta tiene el tiempo necesario para que te sientas escuchado, evaluado y acompañado en tu camino hacia la salud.',
    patient_experience: 'Entrás al consultorio con una preocupación. Antes de cualquier estudio, te escuchamos. Te explicamos tu situación con claridad, sin tecnicismos innecesarios. Salís con un plan concreto y la tranquilidad de saber que tenés un médico que te acompaña.',
    differentiators: [
      'Consultas con tiempo real para escuchar al paciente',
      'Enfoque integral: no tratamos síntomas, entendemos personas',
      'Seguimiento continuo más allá de la consulta',
      'Comunicación clara sin tecnicismos innecesarios'
    ]
  }
}

function buildMockConfig(medico: Record<string, unknown>): Record<string, unknown> {
  const nombre = `${medico.titulo || 'Dr.'} ${medico.nombre || ''} ${medico.apellido || ''}`.trim()
  const espRaw = (medico.especialidades as string[] || [])[0] || 'Especialista médico'
  const esp = espRaw.toLowerCase()
  const ciudad = (medico.ciudad as string) || ''
  const anos = (medico.anos_experiencia as string) || ''
  const bio = (medico.bio as string) || ''

  // Find matching specialty content — prefer exact match, fallback to default (not traumatologia)
  const espNorm = esp.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
  const specKey = Object.keys(SPECIALTY_CONTENT).find(k => k !== 'default' && espNorm.includes(k)) || 'default'
  const spec = SPECIALTY_CONTENT[specKey]

  const diffs = (spec.differentiators as string[]) || []
  if (anos && !diffs.some(d => d.includes(anos))) {
    diffs.unshift(`${anos} años de experiencia clínica en ${espRaw}`)
  }

  // Generate headline based on specialty
  const headlines: Record<string, string> = {
    traumatologia: `${nombre} — Recupera tu movimiento sin miedo`,
    cirugia: `${nombre} — Precisión quirúrgica con propósito`,
    cardiologia: `${nombre} — Tu corazón en manos de precisión`,
    dermatologia: `${nombre} — Piel que recupera tu confianza`,
    ginecologia: `${nombre} — Salud integral de la mujer`,
    neurologia: `${nombre} — Claridad para tu sistema nervioso`,
    rehabilitacion: `${nombre} — Recuperación que se siente`,
    pediatria: `${nombre} — Crecimiento sano, familia tranquila`,
    default: `${nombre} — Atención médica que transforma vidas`
  }
  const headline = headlines[specKey] || `${nombre} — ${espRaw} de excelencia`

  const sub = bio
    ? bio.slice(0, 120) + (bio.length > 120 ? '…' : '')
    : `Especialista en ${espRaw}${ciudad ? ' en ' + ciudad : ''}. Atención que no se queda en el diagnóstico.`

  const about = bio || `${nombre} es especialista en ${espRaw}${ciudad ? ' con práctica en ' + ciudad : ''}.${anos ? ' Con ' + anos + ' años de experiencia clínica, ha desarrollado un enfoque que prioriza la escucha activa y la precisión diagnóstica.' : ''} Su práctica se distingue por combinar la evidencia científica más reciente con una atención genuinamente humana.`

  const services: Array<Record<string, string>> = [
    { t: 'Consulta integral', d: 'Evaluación completa con tiempo real para escuchar todas tus preocupaciones.', i: '🩺' },
    { t: 'Diagnóstico de precisión', d: 'Estudios especializados interpretados con criterio clínico, no solo técnico.', i: '🔬' },
    { t: 'Tratamiento personalizado', d: 'Protocolo adaptado a tu estilo de vida, no a un manual genérico.', i: '✦' },
    { t: 'Seguimiento continuo', d: 'Acompañamiento más allá de la consulta. Tu médico disponible para lo que necesites.', i: '↗' }
  ]

  return {
    headline,
    subheadline: sub,
    about_text: about,
    philosophy: spec.philosophy,
    doctor_story: about,
    differentiators: diffs.slice(0, 5),
    treatment_approach: spec.treatment_approach,
    patient_experience: spec.patient_experience,
    tone: 'cercania-humana',
    benefits: null,
    faq: null,
    services,
    cta_primary: 'Agendar cita',
    cta_final: null,
    seo_title: `${nombre} — ${espRaw}${ciudad ? ' en ' + ciudad : ''}`,
    seo_description: `${nombre}, especialista en ${espRaw}${ciudad ? ' en ' + ciudad : ''}${anos ? ' con ' + anos + ' años de experiencia' : ''}. Atención médica personalizada y de excelencia.`,
    primary_color: '#0b7c6e',
    // Backwards compatibility
    cta_primary_text: 'Agendar cita',
    seo_desc: `${nombre}, especialista en ${espRaw}${ciudad ? ' en ' + ciudad : ''}${anos ? ' con ' + anos + ' años de experiencia' : ''}. Atención médica personalizada y de excelencia.`,
    sobre_quote: spec.philosophy,
    sobre_mi_highlights: diffs.slice(0, 5),
    // Metadata
    generated_at: new Date().toISOString(),
    source: 'mock-specialty'
  }
}

function validateConfig(cfg: Record<string, unknown>): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (!cfg[field] || typeof cfg[field] !== 'string') {
      return `Missing or invalid required field: ${field}`
    }
  }
  return null
}

// ── MAIN HANDLER ──
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    })
  }

  const handlerT0 = Date.now()
  try {
    const body = await req.json()
    const { medico_id, prompt, perception, use_mock } = body

    if (!medico_id) {
      return new Response(JSON.stringify({ error: 'medico_id is required' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch medico context
    const dbT0 = Date.now()
    const { data: medico, error: medicoError } = await sb
      .from('medicos')
      .select('*')
      .eq('id', medico_id)
      .single()
    console.log(`[KIMI DIAGNOSTIC] DB fetch time: ${Date.now() - dbT0}ms`)

    if (medicoError || !medico) {
      return new Response(JSON.stringify({ error: 'Medico not found' }), {
        status: 404,
        headers: corsHeaders
      })
    }

    let config: Record<string, unknown>
    let source = 'kimi'

    console.log('[KIMI DIAGNOSTIC] Handler start. medico_id=' + medico_id + ' use_mock=' + use_mock)
    console.log('[KIMI DIAGNOSTIC] KIMI_API_KEY present?', !!Deno.env.get('KIMI_API_KEY'))

    if (use_mock === true) {
      config = buildMockConfig(medico)
      source = 'mock-specialty'
    } else {
      const apiKey = Deno.env.get('KIMI_API_KEY')
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'KIMI_API_KEY not configured in Edge Function environment' }), {
          status: 503,
          headers: corsHeaders
        })
      }
      try {
        const messages: KimiMessage[] = [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(medico, prompt || '', perception || 'cercania-humana') }
        ]
        config = await callKimiAPI(messages)
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        const diagLogs = (e as any).diagnosticLogs || []
        console.error('Kimi API failed:', errMsg)
        return new Response(JSON.stringify({
          error: 'Kimi API failed',
          detail: errMsg,
          diagnostic_logs: diagLogs
        }), {
          status: 502,
          headers: corsHeaders
        })
      }
    }

    // Normalize and validate
    const validationError = validateConfig(config)
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 422,
        headers: corsHeaders
      })
    }

    // Enrich with backwards-compat fields
    config.cta_primary_text = (config.cta_primary_text || config.cta_primary) as string
    config.seo_desc = (config.seo_desc || config.seo_description) as string
    config.seo_description = (config.seo_description || config.seo_desc) as string
    config.sobre_quote = (config.sobre_quote || config.philosophy) as string
    config.sobre_mi_highlights = (config.sobre_mi_highlights || config.differentiators) as string[]
    config.generated_at = (config.generated_at || new Date().toISOString()) as string

    // Ensure services array exists
    if (!config.services || !Array.isArray(config.services)) {
      config.services = [
        { t: 'Consulta integral', d: 'Evaluación completa con tiempo real para escuchar todas tus preocupaciones.', i: '🩺' },
        { t: 'Diagnóstico de precisión', d: 'Estudios especializados interpretados con criterio clínico.', i: '🔬' },
        { t: 'Tratamiento personalizado', d: 'Protocolo adaptado a tu estilo de vida.', i: '✦' },
        { t: 'Seguimiento continuo', d: 'Acompañamiento más allá de la consulta.', i: '↗' }
      ]
    }

    // Save to web_config_draft
    const { error: updateError } = await sb
      .from('medicos')
      .update({
        web_config_draft: config,
        web_status: medico.web_status === 'active' ? 'active' : 'draft'
      })
      .eq('id', medico_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: corsHeaders
      })
    }

    console.log(`[KIMI DIAGNOSTIC] Handler total time: ${Date.now() - handlerT0}ms`)

    return new Response(JSON.stringify({
      ok: true,
      config,
      source
    }), { headers: corsHeaders })

  } catch (e) {
    console.error('Generate config error:', e)
    console.log(`[KIMI DIAGNOSTIC] Handler failed after: ${Date.now() - handlerT0}ms`)
    return new Response(JSON.stringify({ error: 'internal error', detail: String(e) }), {
      status: 500,
      headers: corsHeaders
    })
  }
})
