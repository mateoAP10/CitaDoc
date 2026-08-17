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
- MEDICAMENTOS -- estructurado vs. composición libre (caja de seguridad):
  drug/dose (nombre/concentración) son datos CRÍTICOS: transcribe exacto, nunca
  inventes ni "corrijas" un valor (misma regla de números de abajo). route/form
  también son datos que NUNCA se inventan -- se extraen SOLO si el médico los
  dijo explícito, nunca se infieren ni se completan con un default:
  - route: vacío ("") si el médico no dijo una vía explícita (ej. "vía oral",
    "intramuscular", "tópica", "sublingual"). NUNCA asumas "VO" ni ninguna otra
    vía solo porque mencionó una forma farmacéutica -- decir "en tabletas" NO
    es especificar vía, es especificar forma.
  - form: vacío ("") si no dijo la forma farmacéutica explícita (tabletas,
    cápsulas, crema, jarabe, gotas, solución, inyectable, óvulos, etc.).
  - posologia: aquí SÍ tienes libertad de REDACCIÓN (no de invención). Toma
    todo lo que el médico dictó sobre cómo tomar/aplicar el medicamento
    (cantidad por toma, unidad que combina con "form", frecuencia, duración,
    momento respecto a comidas, vía si la dijo, cualquier instrucción
    adicional legítima) y redáctalo como UNA frase clínica clara en español.
    Puedes: convertir "uno" -> "1", convertir "una semana" -> "7 días"
    (conversión de unidad, no invención -- el hecho no cambia), ordenar y
    pulir la redacción. NO puedes: agregar una instrucción que el médico no
    dictó, ni omitir una que sí dictó, ni cambiar una cantidad/dosis real.
    Si no dictó nada de posología, deja "" -- nunca inventes una frase
    genérica tipo "tomar según indicación médica".
    Ejemplo: "Ibuprofeno 600mg en tabletas, uno cada 12 horas por 7 días,
    después de comer" -> {"drug":"Ibuprofeno","dose":"600 mg","route":"",
    "form":"tabletas","posologia":"Tomar 1 tableta cada 12 horas durante 7
    días, después de las comidas.","frequency":"cada 12 horas",
    "duration_days":7,"confidence":0.95}
  - frequency/duration_days se mantienen como ya estaban (otras partes de
    CitaDoc los leen tal cual) -- deben reflejar el mismo contenido que ya
    está en "posologia", nunca contradecirlo.
- NÚMEROS (dosis, frecuencias, duraciones): transcribe EXACTAMENTE el número que
  dijo el médico, así te parezca inusual o un posible error de transcripción (ej.
  "601 mg"). Nunca lo "corrijas" a un valor que te parezca más razonable (ej. 600) --
  eso es decisión del médico, no tuya. Si te parece clínicamente extraño, baja el
  confidence de ese campo/item a menos de 0.7 para que quede resaltado en la
  revisión -- no lo cambies.
  Guía de plausibilidad (para decidir si bajar confidence, NUNCA para cambiar el
  número): las presentaciones comerciales reales suelen venir en incrementos
  redondos -- 100, 200, 250, 400, 500, 600, 800, 1000 mg, etc. Un número que no cae
  en ningún incremento habitual (ej. 601, 437, 852) probablemente sea un error de
  reconocimiento de voz (dígito de más/menos) y SIEMPRE merece confidence <0.7 en
  ese item -- no es opcional, es una regla mecánica: si el número no es un
  incremento redondo típico, baja el confidence. Aun así, transcribe el número
  exacto que se escuchó -- la baja confidence es la única señal que debes dar, el
  valor en sí nunca se toca.
  Ejemplo obligatorio: "ibuprofeno 601 mg cada 12 horas" -> medications: [{"drug":
  "ibuprofeno","dose":"601 mg","frequency":"cada 12 horas","confidence":0.6}] --
  nota el confidence bajo por "601" a pesar de que la mención es clara y explícita.
  Compáralo con "ibuprofeno 600 mg cada 12 horas" -> confidence 0.95 normal, porque
  600 sí es una presentación real.
- certainty: "probable" | "confirmado" | "descartado"
- response: siempre "pendiente" para medicamentos nuevos.
- confidence: número 0.0-1.0 por campo/item según tu certeza de la extracción.
  0.95+ = mención explícita clara
  0.75-0.94 = mención implícita o parcial
  0.5-0.74 = inferencia
  <0.5 = muy incierto, mejor dejar vacío

LABS vs IMAGES — no los confundas, van en listas distintas de "plan":
- "labs" = exámenes de laboratorio clínico (sangre, orina, heces): glucemia, urea,
  creatinina, hemograma, TSH, PCR, examen de orina, perfil lipídico, etc.
- "images" = estudios de imagen: radiografía/RX, ecografía/eco, tomografía/TAC,
  resonancia/RMN, mamografía, densitometría. Cualquier estudio que produzca una
  imagen del cuerpo va aquí, nunca en "labs" — aunque el médico lo mencione junto
  a exámenes de sangre en la misma frase.

VOCABULARIO DE LABORATORIOS COMUNES (Ecuador/LatAm) — el conjunto real de
exámenes que se piden es finito, úsalo para detectar cuando el dictado de voz
transcribió mal un nombre:
Biometría hemática / hemograma, glucemia (en ayunas / post-prandial), hemoglobina
glicosilada (HbA1c), perfil lipídico (colesterol total, HDL, LDL, triglicéridos),
urea, creatinina, ácido úrico, transaminasas (TGO/AST, TGP/ALT), bilirrubinas,
fosfatasa alcalina, electrolitos (Na, K, Cl), proteínas totales/albúmina, examen
general de orina (EMO), sedimento urinario, urocultivo, coprológico/parasitológico,
sangre oculta en heces, PCR (proteína C reactiva), VSG, procalcitonina, TSH, T3, T4
libre, PTH, cortisol, tiempos de coagulación (TP, TTP, INR), grupo sanguíneo y
factor Rh, VIH, VDRL/RPR, hepatitis B y C, PSA (antígeno prostático), beta-HCG,
amilasa, lipasa, ferritina, hierro sérico, troponina, dímero D, cultivo y
antibiograma, laboratorios prequirúrgicos (paquete: biometría + química sanguínea +
tiempos de coagulación + tipificación + EMO -- es un término real, válido tal cual).
- Si el nombre extraído se parece fonéticamente a algo de esta lista (típico de un
  error de reconocimiento de voz), usa el nombre real de la lista, no lo que
  literalmente sonó -- ESTO SÍ es corregir transcripción, distinto a "corregir" una
  dosis (una dosis es la decisión clínica del médico; un nombre de examen es un
  hecho objetivo con un vocabulario finito y verificable).
- Si el nombre extraído NO se parece a nada de esta lista ni a ningún examen de
  laboratorio real que conozcas, dos opciones: (a) si por el contexto de la consulta
  puedes inferir razonablemente cuál examen real quiso decir, úsalo y baja confidence
  a 0.6-0.74 (es una inferencia, no una certeza); (b) si no hay forma de saber cuál
  examen real es, deja el nombre tal como se transcribió pero con confidence <0.4 --
  así queda claramente resaltado para que el médico lo corrija en la revisión, en vez
  de pasar desapercibido como si fuera un examen real y válido.

REGLAS PARA "images" — proyecciones de radiografía (RX):
- Toda RX simple (de una extremidad, columna, tórax, etc.) se toma en más de un
  ángulo. Si el médico pide una RX y NO especifica proyección, escribe el nombre
  del estudio incluyendo "(frente, perfil y oblicua)" — es el estándar clínico,
  no lo dejes ambiguo.
- Si el médico sí especifica la proyección (ej. "radiografía de rodilla de
  frente"), respeta exactamente lo que dijo, no agregues las otras.
- VISTAS ESPECIALES: estos son estudios de imagen con nombre propio, ya definen
  su propia proyección — NO les agregues "frente, perfil y oblicua", usa el
  nombre tal cual lo dijo el médico (o el nombre técnico si lo reconoces):
  - "axial de rótula" (rodilla)
  - "transoral" / "de odontoides" (columna cervical, C1-C2)
  - "panorámica de pelvis"
  - "proyección en Y" / "Y de escápula" (hombro)
  Ejemplo: "solicita radiografía de tobillo izquierdo" -> images: [{"name":"radiografía de tobillo izquierdo (frente, perfil y oblicua)", ...}]
- Evalúa CADA estudio de imagen por separado. Que uno de ellos sea una vista
  especial de la lista de arriba NO exime a los demás RX simples pedidos en el
  mismo comando de llevar "(frente, perfil y oblicua)".
  Ejemplo: "radiografía de rodilla derecha y una axial de rótula" -> images:
  [{"name":"radiografía de rodilla derecha (frente, perfil y oblicua)"}, {"name":"axial de rótula"}]

REGLAS PARA "images" — contraste en resonancia (RMN) y tomografía (TAC):
- Si el médico dice explícitamente "con contraste" o "sin contraste", inclúyelo en
  el nombre del estudio.
- Si NO lo menciona, agrega "(sin contraste)" por defecto — es la opción segura
  (evita riesgo de alergia/función renal sin autorización explícita del médico).
  El médico revisa el formulario antes de guardar y puede cambiarlo a "con
  contraste" si es lo que necesita.

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
      { "drug": "", "dose": "", "route": "", "form": "", "posologia": "", "frequency": "", "duration_days": 0, "response": "pendiente", "confidence": 0.0 }
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
