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
    temperature: 0.85,
    max_tokens: 2000
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
  // Sanitizar caracteres no-latinos que Kimi filtra a veces (chino, cirílico, árabe)
  function sanitizeSpanish(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj.replace(/[Ѐ-ӿ一-鿿぀-ゟ゠-ヿ؀-ۿ]/g, '')
                .replace(/\s{2,}/g, ' ').trim()
    }
    if (Array.isArray(obj)) return obj.map(sanitizeSpanish)
    if (obj && typeof obj === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = sanitizeSpanish(v)
      }
      return out
    }
    return obj
  }

  try {
    const parsed = JSON.parse(content)
    return sanitizeSpanish(parsed) as Record<string, unknown>
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
  return `Eres el director de identidad digital de CitaDoc — plataforma de identidad médica premium de LATAM.

IDIOMA: TODO el contenido debe estar en ESPAÑOL. Sin excepción. Headline, subheadline, about_text, differentiators, services, philosophy, doctor_story, patient_experience, cta — todo en español latino natural. Nunca en inglés.


Tu trabajo: crear la identidad web de un médico real. No un template. Una marca.

PRINCIPIO FUNDAMENTAL — JERARQUÍA DE IDENTIDAD:
1. LOGO del médico (60%) — dicta paleta, tipografía mood, elegancia vs energía. El logo ES la identidad. Manda sobre todo.
2. TONO del copy (25%) — cómo habla, qué transmite. Autoridad clínica o cercanía humana.
3. ESPECIALIDAD (15%) — influencia secundaria. Dos traumatólogos pueden verse completamente distintos.

COPY: AUTORIDAD MÉDICA — NO trailer de Marvel
- Headline orientado al paciente. Transmite el resultado que van a obtener.
- Ejemplo correcto: "Recupera tu movimiento. Vive sin límites." — limpio, beneficio claro, sin drama.
- Ejemplo INCORRECTO: "DERRIBADO EL DESAFÍO, SE LEVANTA CON EL DR..." — slogan motivacional genérico.
- Verbos de resultado: recupera, restaura, libera, recuperas, retomas. No: conquista, domina, vence.
- El médico es autoridad confiable, no héroe de acción.

PROHIBIDO ABSOLUTAMENTE:
- "su salud es nuestra prioridad" / "atención de calidad" / "profesional comprometido"
- Adjetivos vacíos: excelente, óptimo, integral, robusto, destacado
- Headlines que parecen slogan de zapatillas o película de superhéroes
- Dramatismo innecesario para especialidades clínicas/quirúrgicas

SOBRE EL LOGO — INSTRUCCIÓN CRÍTICA:
Si recibes logo_url o logo_colors, analiza la estética: ¿serif o sans? ¿oscuro o claro? ¿geométrico o orgánico?
El visual_dna DEBE derivarse del logo, no de la especialidad.
El primary_color DEBE ser el color dominante del logo (o su variación premium).
Un logo navy-serif → clinic o authority. Un logo negro-geométrico → sports solo si es medicina deportiva pura.

Devuelve SOLO JSON válido. Sin markdown. Sin texto fuera del JSON.

{
  "headline": "máx 80 chars — orientado al paciente, transmite resultado, autoridad sin drama",
  "subheadline": "1-2 oraciones de valor real, específicas de esta especialidad, sin clichés",
  "about_text": "2-3 párrafos. Historia de vocación. Por qué ESTE médico. Formación, enfoque, diferencia real.",
  "philosophy": "1 frase de 10-15 palabras. Manifesto de práctica. Queda grabada.",
  "doctor_story": "1 párrafo. El origen. El momento que lo formó. Auténtico, no corporativo.",
  "differentiators": ["4-5 ventajas MUY concretas, técnicas o humanas, específicas de su práctica"],
  "treatment_approach": "1 párrafo. Metodología real. Herramientas y procesos específicos de la especialidad.",
  "patient_experience": "1 párrafo. Cómo se siente el paciente desde que llega hasta que se va. Sensorial.",
  "tone": "cercania-humana | elegancia-premium | confianza-clinica | innovacion-tecnica",
  "visual_dna": "sports | clinic | luxury | authority | warm | modern",
  "primary_color": "#hexcolor — derivado del logo si existe, o del DNA visual elegido",
  "services": [{"t":"nombre","d":"descripción de resultado en 1 línea","i":"emoji"}],
  "cta_primary": "2-3 palabras de acción",
  "cta_final": "frase que cierra con autoridad y calidez (max 60 chars)",
  "seo_title": "title SEO optimizado con nombre + especialidad + ciudad",
  "seo_description": "meta description 150-160 chars con propuesta de valor real"
}

visual_dna — elige UNO basándote en el logo primero, especialidad después:
- sports: medicina DEPORTIVA pura · rendimiento · atletas de alto rendimiento → negro + verde eléctrico, tipografía brutal. SOLO si el médico atiende deportistas/performance. NO para ortopedia clínica.
- clinic: traumatología · ortopedia · rehabilitación · fisioterapia clínica · cirugía articular → blanco + navy institucional, split limpio, tipografía serif elegante, autoridad médica premium
- luxury: plástica · estética · dermatología cosmética · nutrición premium → crema + oro, editorial, silencio de lujo
- authority: neurocirugía · cardiología · oncología · cirugía compleja → azul oscuro + blanco, confianza institucional maciza
- warm: pediatría · medicina familiar · psicología · ginecología → naranja cálido + crema, humano y cercano
- modern: medicina interna · preventiva · general · endocrinología → azul-negro + cyan, futuro médico`
}

function buildUserPrompt(medico: Record<string, unknown>, userPrompt: string, perception: string, logoColors?: string[], anchorDna?: string, anchorColor?: string): string {
  const nombre = `${medico.titulo || 'Dr.'} ${medico.nombre || ''} ${medico.apellido || ''}`.trim()
  const esp = (medico.especialidades as string[] || [])[0] || ''
  const ciudad = (medico.ciudad as string) || ''
  const anos = (medico.anos_experiencia as string) || ''
  const bio = (medico.bio as string) || ''
  const logoUrl = (medico.logo_url as string) || ''
  const fotoUrl = (medico.foto_url as string) || ''

  const parts: string[] = []
  parts.push(`MÉDICO: ${nombre}`)
  parts.push(`ESPECIALIDAD: ${esp}`)
  if (ciudad) parts.push(`CIUDAD: ${ciudad}`)
  if (anos) parts.push(`EXPERIENCIA: ${anos} años`)
  if (bio) parts.push(`BIO: ${bio}`)
  parts.push(`TONO DESEADO: ${perception || 'confianza-clinica'}`)

  // Logo — identidad visual principal (60% del DNA)
  if (logoUrl) {
    parts.push(`LOGO URL: ${logoUrl}`)
    parts.push(`INSTRUCCIÓN LOGO: Analiza la estética del logo (serif/sans, oscuro/claro, geométrico/orgánico) y deriva el visual_dna y primary_color desde ahí. El logo manda sobre la especialidad.`)
  }
  if (fotoUrl) {
    parts.push(`FOTO DEL MÉDICO: ${fotoUrl}`)
  }
  if (logoColors && logoColors.length > 0) {
    parts.push(`COLORES EXTRAÍDOS DEL LOGO: ${logoColors.join(', ')} — usa el color dominante como primary_color y confirma el visual_dna desde esta paleta.`)
  }
  if (!logoUrl && !fotoUrl && (!logoColors || logoColors.length === 0)) {
    parts.push(`(Sin identidad visual subida — asigna visual_dna basándote en especialidad, defaultea a 'clinic' para especialidades clínicas)`)
  }

  // Anclar identidad visual establecida — si el médico ya tiene DNA y color definidos,
  // SOLO varía el copy. La identidad visual no cambia entre regeneraciones.
  if (anchorDna && anchorColor) {
    parts.push(`\nIDENTIDAD VISUAL YA ESTABLECIDA — MANTENER FIJA:`)
    parts.push(`visual_dna: "${anchorDna}" — NO cambiar, este es el estilo de marca del médico.`)
    parts.push(`primary_color: "${anchorColor}" — NO cambiar, es el color de su identidad.`)
    parts.push(`Tu trabajo en esta regeneración: crear NUEVO copy (headline, about, differentiators, servicios) más fresco y poderoso. La identidad visual ya está definida, el copy puede y debe mejorar.`)
  } else if (anchorDna) {
    parts.push(`visual_dna establecido previamente: "${anchorDna}" — mantenerlo a menos que el logo indique algo diferente.`)
  }

  if (userPrompt) parts.push(`BRIEF DEL MÉDICO: ${userPrompt}`)

  return parts.join('\n')
    + `\n\nGenera identidad web para este médico. Headline orientado al paciente, resultado claro, sin drama. Differentiators técnicos específicos de ${esp}. Copy de autoridad médica premium. DNA visual ${anchorDna ? 'ya establecido: ' + anchorDna : 'derivado del logo o especialidad'}.`
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

function assignPrimaryColor(esp: string): string {
  const e = esp.toLowerCase()
  if (['deport','rendimiento','atletism'].some(k => e.includes(k))) return '#16a34a'
  if (['traumato','ortoped','rehabilit','kinesi','fisio'].some(k => e.includes(k))) return '#1a2e44'
  if (['plástic','estet','dermat','cosmét','nutrici'].some(k => e.includes(k))) return '#92400e'
  if (['neuro','cardio','oncolog'].some(k => e.includes(k))) return '#1e3a8a'
  if (['pediatr','familiar','psicolog','ginecol'].some(k => e.includes(k))) return '#9a3412'
  return '#1a2e44'
}

// Deriva el DNA visual desde el color dominante del logo
// Esta función es el corazón de la identidad: el logo MANDA sobre la especialidad
function logoColorToDna(hexColor: string): string | null {
  if (!hexColor) return null
  const hex = hexColor.replace('#', '')
  if (hex.length < 6) return null
  const r = parseInt(hex.slice(0,2), 16)
  const g = parseInt(hex.slice(2,4), 16)
  const b = parseInt(hex.slice(4,6), 16)
  const max = Math.max(r,g,b)
  const min = Math.min(r,g,b)
  const lightness = (max+min) / 510 // 0-1
  const saturation = max === 0 ? 0 : (max-min)/max

  // Muy oscuro (negro, navy profundo) → sports o authority según saturación
  if (lightness < 0.18) return saturation > 0.3 ? 'sports' : 'authority'
  // Verde dominante → sports
  if (g > r*1.2 && g > b*1.2 && saturation > 0.25) return 'sports'
  // Rojo/naranja dominante → warm
  if (r > g*1.3 && r > b*1.3 && r > 140) return 'warm'
  // Azul dominante, oscuro → clinic/authority
  if (b > r*1.2 && b > g*1.1 && lightness < 0.5) return lightness < 0.3 ? 'authority' : 'clinic'
  // Dorado/crema (alta R+G, baja B, saturación baja) → luxury
  if (r > 160 && g > 130 && b < 100 && saturation < 0.5) return 'luxury'
  // Cian/teal brillante → modern
  if (b > 150 && g > 150 && r < 120) return 'modern'
  // Por defecto: clinic (profesional, neutro)
  return 'clinic'
}

function assignDNAFallback(esp: string): string {
  const e = esp.toLowerCase()
  if (['deport','rendimiento','atletism','performanc'].some(k => e.includes(k))) return 'sports'
  if (['traumato','ortoped','rehabilit','kinesi','musculo','fisio'].some(k => e.includes(k))) return 'clinic'
  if (['plástic','plastic','estet','dermat','cosmét','nutrici'].some(k => e.includes(k))) return 'luxury'
  if (['neuro','cardio','cirug','oncolog','hematol'].some(k => e.includes(k))) return 'authority'
  if (['pediatr','familiar','psicolog','psiquiat','ginecol','obstetr'].some(k => e.includes(k))) return 'warm'
  return 'clinic' // default premium clínico
}

// Perception → DNA override (cuando el médico elige explícitamente un estilo)
const PERCEPTION_DNA: Record<string, string> = {
  'alto-rendimiento':  'sports',
  'elegancia-premium': 'luxury',
  'confianza-clinica': 'authority',
  'innovacion-medica': 'modern',
  'cercania-humana':   'warm',
  'recuperacion-dep':  'sports',
}

// Perception → rango de headlines (0-3 formal/premium, 4-7 energético/cercano)
const PERCEPTION_HL_RANGE: Record<string, [number,number]> = {
  'elegancia-premium': [0, 3],   // primeros 4 — más formales/premium
  'confianza-clinica': [0, 3],
  'alto-rendimiento':  [4, 7],   // últimos 4 — más energéticos
  'recuperacion-dep':  [4, 7],
  'innovacion-medica': [2, 5],   // mix
  'cercania-humana':   [4, 7],   // más cálidos
}

function buildMockConfig(medico: Record<string, unknown>, logoColors?: string[], perception?: string): Record<string, unknown> {
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

  // Headlines con variación real — 8 opciones por especialidad, rotación aleatoria
  const HEADLINES: Record<string, string[]> = {
    traumatologia: [
      'Recupera tu movimiento. Vive sin límites.',
      'Tu cuerpo sabe moverse. Nosotros lo recordamos.',
      'Cada lesión tiene solución. Empecemos.',
      'De la lesión al movimiento pleno.',
      'Precisión quirúrgica. Recuperación real.',
      'Tu movilidad es nuestra especialidad.',
      'Vuelve a moverte como antes. Mejor que antes.',
      'Ortopedia que entiende tu ritmo de vida.'
    ],
    cirugia: [
      'Cirugía con propósito. Resultados que duran.',
      'Precisión quirúrgica al servicio de tu salud.',
      'No operamos por rutina. Operamos con certeza.',
      'Cada intervención, una decisión precisa.',
      'Tu seguridad es nuestra primera incisión.',
      'Cirugía de vanguardia, recuperación guiada.',
      'Del diagnóstico a la cirugía sin incertidumbre.',
      'Confianza quirúrgica que se construye paso a paso.'
    ],
    cardiologia: [
      'Tu corazón merece precisión y cuidado.',
      'El ritmo de tu vida empieza en tu corazón.',
      'Cardiología preventiva que cuida tu futuro.',
      'Un corazón fuerte. Una vida plena.',
      'Diagnóstico preciso. Corazón protegido.',
      'Cuida tu motor. Cuida tu vida.',
      'Cardiología con visión integral y humana.',
      'Tu corazón habla. Nosotros lo escuchamos.'
    ],
    dermatologia: [
      'Tu piel cuenta tu historia. Cuidémosla.',
      'Piel sana. Confianza renovada.',
      'Dermatología que va más allá de la superficie.',
      'Diagnóstico preciso para una piel que resplandece.',
      'Cada piel es única. Tu tratamiento también.',
      'La piel que quieres. El cuidado que mereces.',
      'Salud de piel. Bienestar visible.',
      'Dermato­logía con ciencia y sensibilidad.'
    ],
    ginecologia: [
      'Salud femenina integral, en cada etapa.',
      'Acompañamos cada ciclo de tu vida.',
      'Tu salud, en manos que la entienden.',
      'Ginecología con enfoque humano y preciso.',
      'Cada mujer, un plan de salud único.',
      'Desde la prevención hasta el bienestar pleno.',
      'Tu salud reproductiva, nuestra prioridad.',
      'Atención ginecológica que te escucha de verdad.'
    ],
    neurologia: [
      'Claridad diagnóstica para un sistema nervioso sano.',
      'Neurología que entiende lo que el cerebro no dice.',
      'Tu mente en manos expertas y empáticas.',
      'Diagnóstico neurológico preciso y humano.',
      'Del síntoma al diagnóstico sin demoras.',
      'Neurología de vanguardia con calidez clínica.',
      'Tu bienestar neurológico, nuestra misión.',
      'Cuando el cerebro necesita al mejor aliado.'
    ],
    rehabilitacion: [
      'Recuperación que se siente en cada paso.',
      'No solo sanas. Volvés mejor que antes.',
      'Rehabilitación con objetivos reales.',
      'Tu movimiento es nuestra medida de éxito.',
      'De la lesión a la acción, paso a paso.',
      'Fisioterapia que mide resultados, no sesiones.',
      'Rehabilitación de alta especialidad.',
      'Tu cuerpo en su mejor versión. Siempre.'
    ],
    pediatria: [
      'Crecimiento sano. Familia tranquila.',
      'Cada niño, una historia de salud única.',
      'Pediatría que cuida el cuerpo y el alma.',
      'Tu hijo en las mejores manos desde el primer día.',
      'Salud pediátrica integral con calidez.',
      'Crecemos contigo, cuidamos a los tuyos.',
      'Pediatría moderna con corazón.',
      'La salud de tu hijo, nuestra vocación.'
    ],
    default: [
      'Atención médica que transforma vidas.',
      'Tu salud, nuestra vocación.',
      'Medicina con propósito y humanidad.',
      'Diagnóstico preciso. Cuidado genuino.',
      'Salud integral para una vida plena.',
      'Tu médico de confianza, siempre presente.',
      'Medicina de excelencia con calidez humana.',
      'Atención que va más allá del diagnóstico.'
    ]
  }

  const headlinePool = HEADLINES[specKey] || HEADLINES.default
  // Si hay perception, pick del rango correspondiente; sino, aleatorio total
  let headline: string
  if (perception && PERCEPTION_HL_RANGE[perception]) {
    const [lo, hi] = PERCEPTION_HL_RANGE[perception]
    const available = headlinePool.slice(lo, hi+1)
    headline = available[Math.floor(Math.random() * available.length)]
  } else {
    headline = headlinePool[Math.floor(Math.random() * headlinePool.length)]
  }

  // Servicios específicos por especialidad
  const SERVICES: Record<string, Array<Record<string, string>>> = {
    traumatologia: [
      { t: 'Lesiones deportivas', d: 'Diagnóstico y tratamiento de lesiones en deportistas y pacientes activos.', i: '🏃' },
      { t: 'Cirugía artroscópica', d: 'Técnica mínimamente invasiva con recuperación más rápida y menor dolor.', i: '🔬' },
      { t: 'Fracturas y trauma', d: 'Atención especializada en fracturas complejas con fijación de precisión.', i: '🦴' },
      { t: 'Reemplazo articular', d: 'Prótesis de cadera y rodilla con resultados duraderos y movilidad plena.', i: '⚕️' }
    ],
    cirugia: [
      { t: 'Cirugía laparoscópica', d: 'Técnica mínimamente invasiva, menos dolor y recuperación acelerada.', i: '🏥' },
      { t: 'Cirugía de urgencia', d: 'Respuesta rápida y precisa en situaciones de emergencia quirúrgica.', i: '⚡' },
      { t: 'Cirugía oncológica', d: 'Resección tumoral con márgenes precisos y preservación de función.', i: '🎗️' },
      { t: 'Segunda opinión', d: 'Evaluación quirúrgica independiente con criterio clínico experto.', i: '💬' }
    ],
    default: [
      { t: 'Consulta integral', d: 'Evaluación completa con tiempo real para escuchar todas tus preocupaciones.', i: '🩺' },
      { t: 'Diagnóstico de precisión', d: 'Estudios especializados interpretados con criterio clínico experto.', i: '🔬' },
      { t: 'Tratamiento personalizado', d: 'Protocolo adaptado a tu estilo de vida y tus objetivos de salud.', i: '✦' },
      { t: 'Seguimiento continuo', d: 'Acompañamiento más allá de la consulta, siempre disponible para ti.', i: '↗' }
    ]
  }

  const services = SERVICES[specKey] || SERVICES.default

  const sub = bio
    ? bio.slice(0, 130) + (bio.length > 130 ? '.' : '')
    : `Especialista en ${espRaw}${ciudad ? ' en ' + ciudad : ''}.${anos ? ' ' + anos + ' años de experiencia clínica.' : ''} Atención que va más allá del diagnóstico.`

  const about = bio || `${nombre} es especialista en ${espRaw}${ciudad ? ' con práctica en ' + ciudad : ''}.${anos ? ' Con ' + anos + ' años de experiencia, ha desarrollado un enfoque que combina precisión diagnóstica y atención genuinamente humana.' : ''} Su práctica se distingue por tratar a cada paciente como un caso único, nunca como un número.`

  return {
    headline,
    subheadline: sub,
    about_text: about,
    philosophy: spec.philosophy,
    doctor_story: about,
    differentiators: diffs.slice(0, 5),
    treatment_approach: spec.treatment_approach,
    patient_experience: spec.patient_experience,
    tone: 'confianza-clinica',
    visual_dna: assignDNAFallback(espRaw),
    benefits: null,
    faq: null,
    services,
    cta_primary: 'Agendar cita',
    cta_final: null,
    seo_title: `${nombre} — ${espRaw}${ciudad ? ' en ' + ciudad : ''}`,
    seo_description: `${nombre}, especialista en ${espRaw}${ciudad ? ' en ' + ciudad : ''}${anos ? ' con ' + anos + ' años de experiencia' : ''}. Atención médica personalizada y de excelencia.`,
    primary_color: (logoColors && logoColors.length > 0) ? logoColors[0] : assignPrimaryColor(espRaw),
    // Jerarquía: perception explícita > logo > especialidad
    visual_dna: (perception && PERCEPTION_DNA[perception])
      ? PERCEPTION_DNA[perception]
      : (logoColors && logoColors.length > 0)
        ? (logoColorToDna(logoColors[0]) || assignDNAFallback(espRaw))
        : assignDNAFallback(espRaw),
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

// ── CLAUDE VISION API ──
// Analiza foto + logo del médico y genera identidad ÚNICA con visión real
async function callClaudeVisionAPI(
  medico: Record<string, unknown>,
  photoUrl: string,
  logoUrl: string,
  perception: string,
  userPrompt: string,
  logoColors: string[]
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const nombre = `${medico.titulo || 'Dr.'} ${medico.nombre || ''} ${medico.apellido || ''}`.trim()
  const esp    = (medico.especialidades as string[] || [])[0] || ''
  const ciudad = (medico.ciudad as string) || ''
  const anos   = (medico.anos_experiencia as string) || ''
  const bio    = (medico.bio as string) || ''

  // Construir bloques de contenido con imágenes reales
  const contentBlocks: unknown[] = []
  if (photoUrl) {
    contentBlocks.push({ type: 'image', source: { type: 'url', url: photoUrl } })
    contentBlocks.push({ type: 'text', text: 'Foto profesional del médico.' })
  }
  if (logoUrl) {
    contentBlocks.push({ type: 'image', source: { type: 'url', url: logoUrl } })
    contentBlocks.push({ type: 'text', text: 'Logo de su práctica médica.' })
  }

  const infoText = [
    `MÉDICO: ${nombre}`,
    `ESPECIALIDAD: ${esp}`,
    ciudad && `CIUDAD: ${ciudad}`,
    anos   && `EXPERIENCIA: ${anos} años`,
    bio    && `BIO: ${bio}`,
    userPrompt && `BRIEF: ${userPrompt}`,
    `TONO: ${perception || 'confianza-clinica'}`,
    logoColors.length > 0 && `COLORES LOGO: ${logoColors.join(', ')}`,
    '',
    'Devuelve SOLO JSON válido. Sin markdown. Sin texto fuera del JSON.'
  ].filter(Boolean).join('\n')
  contentBlocks.push({ type: 'text', text: infoText })

  const systemPrompt = `Eres el director creativo de identidad médica digital de LATAM. Ves las imágenes y te ATREVES.

IDIOMA: TODO en español latino. Sin excepción.

METODOLOGÍA — PRIMERO OBSERVA, LUEGO CREA:

1. ANALIZA EL LOGO con precisión:
   - ¿Qué colores exactos ves? Derivá el hex del color dominante.
   - ¿Serif o sans? Serif = institucional premium. Sans = moderno.
   - ¿Geométrico, orgánico, minimalista? Cada decisión habla.
   - Ese logo es la identidad. Manda sobre todo lo demás.

2. LEE LA FOTO del médico con atención clínica:
   - Postura: ¿brazos cruzados = autoridad? ¿relajado = cercanía? ¿mirando a cámara = directo?
   - Expresión: ¿confianza, calidez, seriedad, energía?
   - Vestimenta: ¿scrubs, guardapolvo, traje? Define el mundo de este médico.
   - Ambiente: ¿quirófano, consultorio, exterior? Contexto que suma.
   - Usá todo lo que ves para que el copy suene a ESTA persona específica.

3. CREA CON ATREVIMIENTO — no con miedo:
   - El headline tiene que detenerse. No puede ser de cualquier médico.
   - Debe capturar lo que viste en la foto: si es autoridad → soná con autoridad. Si es cercanía → soná cercano.
   - Cada diferenciador debe ser verificable, específico, clínico. No "excelente calidad".
   - La filosofía debe revelar una convicción genuina, no un manual corporativo.

REGLAS DE COPY:
- Headline: beneficio real del paciente + identidad del médico, máx 75 chars
- BUENO: "Recupera tu movimiento. Vuelve a lo que amás." — claro, tuyo, directo
- BUENO: "Tu columna no es un problema. Es una solución pendiente." — audaz
- MALO: "Atención de calidad para tu bienestar integral" — podría ser cualquiera
- Verbos de resultado: recuperás, retomás, volvés, liberás, restaurás
- Servicios: 4 servicios ESPECÍFICOS de esta especialidad, no genéricos

IDENTIDAD VISUAL:
- primary_color: extráelo del logo. Si no hay logo, del tono de la foto.
- visual_dna según el logo y la especialidad:
  · clinic → traumatología, ortopedia, cirugía articular, rehabilitación, fisioterapia clínica (split limpio, navy, elegante)
  · authority → SOLO neurocirugía, cardiología, oncología, hepatología (paleta azul oscura institucional)
  · sports → medicina deportiva pura, performance, atletas de alto rendimiento (negro + verde eléctrico)
  · luxury → estética, dermatología cosmética, cirugía plástica (crema + dorado)
  · warm → pediatría, psicología, medicina familiar, ginecología (naranja cálido)
  · modern → medicina interna, preventiva, tecnología médica (cian/tech)
  IMPORTANTE: un traumatólogo con fellowship y máster usa SIEMPRE "clinic" — sus credenciales elevan el copy, no el DNA
- El color que elegís tiñe botones, nav, headlines. Elegí el correcto.

SISTEMA DE LAYOUTS — 6 DNAs editoriales reales:

"clinic-editorial"
- fondo BLANCO · split 52/48 · serif premium · foto retocada
- Para: traumatología, ortopedia, cirugía, clínicas premium
- Ejemplo: renderMAP.png — el estándar de excelencia

"surgical-authority"
- fondo NEGRO (#08192D) · foto fullscreen · gradiente left→right · logo en hero
- Para: cirujanos high-prestige, dermato estética, oncología, luxury medical
- Headline enorme serif sobre la foto

"performance-clinic"
- fondo BLANCO · split 50/50 · azul fuerte (#0E3B99) · foto full-body bottom-aligned
- Para: fisioterapia deportiva, rehabilitación, sports medicine, recovery
- Headline brutal bold, energía positiva, CTAs azul redondeados

"academic-prestige"
- fondo BLANCO · split 54/46 · grid modular · línea separadora sobre headline
- Para: médicos académicos, investigadores, especialistas con credenciales extensas
- Foto desaturada, copy técnico, serif institucional

"soft-clinic-luxury"
- fondo CREMA-LAVANDA (#FAF8FC) · split 50/50 · lavanda (#A78BC7) · foto full-body bottom
- Para: periodoncia, ginecología, pediatría, nutrición, cualquier especialidad femenina o de bienestar
- Serif italic, CTAs redondeados suaves, calma + confianza + cuidado

"future-minimal"
- fondo BLANCO · split 62/38 · tipografía enorme light · whitespace masivo · sin pill badge
- Para: médicos tech-forward, preventiva, innovadores, marca personal fuerte
- Un solo CTA, foto como acento gráfico, editorial puro

VISUAL DNA (solo colores — separado del layout):
- clinic → navy institucional (traumato, ortopedia, rehabilit)
- sports → negro + verde eléctrico (medicina deportiva pura)
- luxury → crema + dorado (estética, plástica, derma cosmética)
- authority → azul oscuro (neuro, cardio, oncología)
- warm → naranja cálido (pediatría, psico, familiar)
- modern → cian + negro tech (medicina preventiva, tech)

JSON a devolver (SOLO JSON, sin texto antes ni después):
{
  "headline": "...",
  "subheadline": "1-2 oraciones de valor real, sin clichés",
  "about_text": "2-3 párrafos. Historia de vocación. Por qué ESTE médico.",
  "philosophy": "1 frase manifesto. Debe quedar grabada.",
  "doctor_story": "1 párrafo. El origen. Lo que lo define.",
  "differentiators": ["específico 1", "específico 2", "específico 3", "específico 4"],
  "treatment_approach": "Metodología real de esta práctica",
  "patient_experience": "Cómo se siente el paciente. Sensorial.",
  "tone": "confianza-clinica|cercania-humana|elegancia-premium|innovacion-medica",
  "visual_dna": "clinic|sports|luxury|authority|warm|modern",
  "layout_id": "clinic-editorial|surgical-authority|performance-clinic|academic-prestige|soft-clinic-luxury|future-minimal",
  "primary_color": "#hexcolor exacto del logo o foto",
  "services": [{"t":"nombre específico","d":"descripción 1 línea con resultado","i":"emoji"}],
  "cta_primary": "Agendar cita",
  "cta_final": "frase que cierra con autoridad (máx 60 chars)",
  "seo_title": "Nombre — Especialidad en Ciudad",
  "seo_description": "150-160 chars con propuesta de valor real"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks }]
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 400)}`)
  }

  const data = await res.json()
  const rawContent = (data.content as Array<{type:string; text?:string}>)?.[0]?.text || ''

  // Sanear caracteres no-latinos y parsear JSON
  function sanitize(obj: unknown): unknown {
    if (typeof obj === 'string') return obj.replace(/[Ѐ-ӿ一-鿿぀-ゟ゠-ヿ؀-ۿ]/g, '').replace(/\s{2,}/g, ' ').trim()
    if (Array.isArray(obj)) return obj.map(sanitize)
    if (obj && typeof obj === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = sanitize(v)
      return out
    }
    return obj
  }

  try {
    return sanitize(JSON.parse(rawContent)) as Record<string, unknown>
  } catch {
    const m = rawContent.match(/```json\s*([\s\S]*?)\s*```/)
    if (m) return sanitize(JSON.parse(m[1])) as Record<string, unknown>
    const s = rawContent.indexOf('{'), e = rawContent.lastIndexOf('}')
    if (s !== -1 && e !== -1) return sanitize(JSON.parse(rawContent.slice(s, e + 1))) as Record<string, unknown>
    throw new Error('Claude response no es JSON válido: ' + rawContent.slice(0, 300))
  }
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
    const { medico_id, prompt, perception, use_mock, logo_colors, anchor_dna, anchor_color,
            logo_url: reqLogoUrl, photo_url: reqPhotoUrl } = body

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

    // Resolver URLs de imagen para Claude vision
    const existingDraft = medico.web_config_draft as Record<string, unknown> | null
    const photoUrl = (reqPhotoUrl as string) || (medico.foto_url as string) || ''
    const logoUrl  = (reqLogoUrl  as string) || (existingDraft?.logo_url as string) || ''
    const hasImages = !!(photoUrl || logoUrl)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const kimiKey      = Deno.env.get('KIMI_API_KEY')

    console.log(`[AI] medico_id=${medico_id} use_mock=${use_mock} hasImages=${hasImages} claude=${!!anthropicKey} kimi=${!!kimiKey}`)

    if (use_mock === true) {
      // Mock garantizado: español perfecto, variación de headlines, rápido
      config = buildMockConfig(medico, logo_colors || [], perception || '')
      source = 'mock-specialty'

    } else if (anthropicKey) {
      // ★ CLAUDE — primario: ve las imágenes, genera identidad real
      try {
        config = await callClaudeVisionAPI(
          medico, photoUrl, logoUrl,
          perception || 'confianza-clinica',
          prompt || '',
          logo_colors || []
        )
        source = 'claude-vision'
        console.log('[AI] Claude vision ✓')
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        console.error('[AI] Claude failed, falling back to mock:', errMsg)
        config = buildMockConfig(medico, logo_colors || [], perception || '')
        source = 'mock-fallback'
      }

    } else if (kimiKey) {
      // Kimi — fallback si no hay Claude
      try {
        const messages: KimiMessage[] = [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(medico, prompt || '', perception || 'confianza-clinica', logo_colors || [], anchor_dna, anchor_color) }
        ]
        config = await callKimiAPI(messages)
        source = 'kimi'
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        console.error('[AI] Kimi failed, falling back to mock:', errMsg)
        config = buildMockConfig(medico, logo_colors || [], perception || '')
        source = 'mock-fallback'
      }

    } else {
      // Sin API key: mock con variación
      config = buildMockConfig(medico, logo_colors || [], perception || '')
      source = 'mock-specialty'
    }

    // Anchors: solo aplican si NO se subió logo nuevo (para mantener consistencia visual entre regeneraciones)
    // Si hay logo_colors recientes, el logo manda — no el anchor del draft anterior
    const hasNewLogo = logo_colors && logo_colors.length > 0
    if (!hasNewLogo && anchor_dna) config.visual_dna = anchor_dna
    if (!hasNewLogo && anchor_color) config.primary_color = anchor_color

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
