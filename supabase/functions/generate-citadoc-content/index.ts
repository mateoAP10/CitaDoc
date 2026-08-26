import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-growth-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

// ── BRAND CONTEXT ─────────────────────────────────────────────────────
// Centrado en el médico, no en el producto.
// CitaDoc aparece como solución natural, no como sujeto del contenido.
const BRAND_CONTEXT = `
Hablas con médicos especialistas de LATAM con práctica privada.

Su mundo real:
- Gestionan su agenda por WhatsApp, Excel o papel
- Su reputación vive en boca a boca, no en su presencia digital
- Quieren crecer pero no saben cómo diferenciarse online
- Sienten que la tecnología médica es fea, complicada y genérica
- Aspiran a una práctica más ordenada, más moderna, más reconocida
- Su identidad profesional es su mayor activo, no su software

CitaDoc existe para estos médicos.
No como "software médico".
Como la infraestructura premium que hace visible su excelencia.

Cuando CitaDoc aparece en el contenido:
- No es el héroe. El médico es el héroe.
- Es el sistema que permite que el médico sea quien ya quiere ser.
- Nunca "plataforma robusta", nunca "solución integral"
- Siempre concreto, siempre emocional, siempre real.

Mercado: Ecuador → Colombia → Perú → LATAM
Posicionamiento: "la capa AI del médico moderno"
`

// ── NUEVA TAXONOMÍA DE CONTENIDO ──────────────────────────────────────
// Ratio correcto: 5 educación/dolor/aspiración : 1 showcase directo
// Objetivo: construir autoridad de marca antes de escalar conversión
const PROMPTS: Record<string, string> = {

  // TIPO 1 — CAROUSEL EDU (autoridad) ───────────────────────────────
  // Educación médica premium. El médico aprende algo valioso.
  // CitaDoc aparece al final como el sistema que lo hace posible.
  carousel_edu: `Genera un carousel educativo de 6 slides para un médico especialista.

El tema debe ser sobre: gestión de práctica médica, reputación digital del médico, experiencia del paciente, eficiencia clínica, o branding médico moderno.

NO es un anuncio. ES contenido de valor que un médico guardaría.
CitaDoc puede aparecer sutilmente en el slide 6 como "esto es posible con el sistema correcto".

RESPONDE EN JSON:
{
  "topic": "tema específico del carousel",
  "slides": [
    {"num": 1, "headline": "hook que detiene el scroll (máx 6 palabras)", "subtext": "apoyo que genera curiosidad"},
    {"num": 2, "headline": "punto 1 del tema", "subtext": "explicación concreta"},
    {"num": 3, "headline": "punto 2", "subtext": "dato o insight real"},
    {"num": 4, "headline": "punto 3", "subtext": "ejemplo o caso"},
    {"num": 5, "headline": "punto 4 o síntesis", "subtext": "el insight más valioso"},
    {"num": 6, "headline": "conclusión + CTA sutil", "subtext": "dónde aplicar esto"}
  ],
  "caption": "caption que presenta el carousel como recurso valioso (no como ad)"
}`,

  // TIPO 2 — PAIN HOOK (atención) ───────────────────────────────────
  // Identifica un dolor real del médico. Sin vender nada.
  // El contenido termina cuando el médico piensa "exactamente así me siento".
  pain_hook: `Genera contenido que describe un dolor real y específico de un médico con práctica privada.

NO ofrezcas solución. NO menciones CitaDoc. NO vendas.
Solo muestra que entiendes profundamente la experiencia del médico.
El médico debe sentir: "esto es exactamente lo que me pasa".

Formatos posibles: reel hook + guión, caption corto, o post de texto.

RESPONDE EN JSON:
{
  "format": "reel_hook / caption / post_texto",
  "pain": "el dolor específico que aborda este contenido",
  "hook": "primera línea que detiene el scroll (máx 8 palabras, sin pregunta genérica)",
  "script_or_body": "guión completo si es reel (con indicaciones entre [corchetes]), o cuerpo si es caption/post",
  "caption": "caption para Instagram (si aplica)",
  "tone_note": "por qué este dolor resuena en este médico"
}`,

  // TIPO 3 — ASPIRATION POST (deseo) ────────────────────────────────
  // Muestra cómo se ve la práctica médica del futuro.
  // Sin decir "compra CitaDoc". El médico debe querer ser ese médico.
  aspiration_post: `Genera contenido aspiracional que muestra cómo se ve la práctica médica moderna y premium.

NO es un anuncio. ES una imagen del futuro al que el médico quiere llegar.
CitaDoc puede aparecer implícitamente como el sistema que lo hace posible, sin nombrarlo directamente.

Formato: reel OR carousel OR caption inspiracional.

RESPONDE EN JSON:
{
  "format": "reel / carousel / caption",
  "aspiration": "qué imagen del futuro construye este contenido",
  "hook": "apertura que genera deseo inmediato",
  "script_or_slides": "guión completo (reel) o array de slides {num, headline, subtext} (carousel) o cuerpo (caption)",
  "caption": "caption con tono aspiracional premium",
  "visual_direction": "descripción del visual ideal para este contenido"
}`,

  // TIPO 4 — AI CURIOSITY (modernidad) ──────────────────────────────
  // Genera curiosidad sobre cómo la AI está cambiando la medicina.
  // No vende AI. La hace parecer inevitable y accesible.
  ai_curiosity: `Genera contenido que despierte curiosidad en médicos sobre cómo la inteligencia artificial ya está cambiando la práctica médica.

NO es técnico. NO vende AI. MUESTRA posibilidades concretas y humanas.
El médico debe sentir: "no sabía que esto era posible" o "esto ya es real".

Formato preferido: carousel o reel corto.

RESPONDE EN JSON:
{
  "format": "carousel / reel",
  "curiosity_hook": "la afirmación o dato que genera curiosidad inmediata",
  "content": "guión (reel) o slides {num, headline, subtext} (carousel)",
  "caption": "caption con tono de descubrimiento, no de venta",
  "key_insight": "el insight central que el médico se lleva"
}`,

  // TIPO 5 — TRANSFORMATION (conversión) ────────────────────────────
  // RARO. Solo cuando hay caso real. 5:1 ratio.
  // Muestra una transformación específica y creíble. Nunca genérico.
  transformation: `Genera contenido de transformación real de un médico con CitaDoc.

IMPORTANTE: debe ser específico, creíble, con métricas concretas si es posible.
NUNCA genérico. NUNCA "el sistema que transformó mi práctica".
Si no hay caso real, usa un escenario hipotético MUY específico que parezca real.

Formato: reel testimonial OR antes/después OR historia de 60 días.

RESPONDE EN JSON:
{
  "format": "reel_testimonial / antes_despues / historia_60dias",
  "doctor_profile": "perfil del médico (especialidad, ciudad, tipo de práctica)",
  "before": "situación concreta antes (con detalles reales)",
  "after": "resultado concreto después (con métricas o cambios específicos)",
  "hook": "apertura que genera credibilidad inmediata",
  "script_or_body": "guión o cuerpo completo",
  "caption": "caption con prueba social y CTA directo",
  "cta": "llamado a la acción específico para este contenido"
}`,

  // LEGACY — mantenidos para conversión directa ─────────────────────
  founder: `Genera un post estilo founder auténtico para LinkedIn sobre por qué se construyó CitaDoc y qué problema médico resuelve.

Voz personal, primera persona, honesta. El fundador habla de los médicos, no del software.

RESPONDE EN JSON:
{
  "post": "post completo (4-6 párrafos cortos, estilo founder moderno, centrado en el médico)",
  "hook": "primera línea que detiene el scroll"
}`,

  ad: `Genera copy de anuncio pago para Facebook/Instagram Ads dirigido a médicos especialistas.

El anuncio habla del médico, no del producto. El beneficio es la identidad y el crecimiento, no las features.

RESPONDE EN JSON:
{
  "headline": "título (máx 40 caracteres, benefit-first para el médico)",
  "subheadline": "subtítulo (máx 60 caracteres)",
  "body": "cuerpo (3-4 líneas, problema → solución → resultado)",
  "cta_button": "texto del botón (máx 20 caracteres)",
  "target_note": "targeting recomendado"
}`,

  campaign: `Eres un experto en Meta Ads y marketing B2B para healthtech en LATAM.
Genera una campaña completa de Meta Ads para adquirir médicos especialistas para CitaDoc.
El ángulo de los anuncios: hablar del médico, no del software.

RESPONDE EN JSON:
{
  "campaign_name": "nombre sugerido",
  "objective": "objetivo Meta recomendado",
  "audience": {
    "age_range": "rango de edad",
    "gender": "all / men / women",
    "locations": ["ciudades exactas"],
    "interests": ["intereses en Meta"],
    "behaviors": ["comportamientos Meta"],
    "exclusions": ["qué excluir"]
  },
  "ad_variants": [
    {"variant":"A","format":"imagen o video","headline":"...","primary_text":"...","description":"...","cta_button":"...","visual_brief":"..."},
    {"variant":"B","format":"imagen o video","headline":"...","primary_text":"...","description":"...","cta_button":"...","visual_brief":"..."},
    {"variant":"C","format":"imagen o video","headline":"...","primary_text":"...","description":"...","cta_button":"...","visual_brief":"..."}
  ],
  "budget": {
    "daily_budget_usd": "...",
    "duration_days": "...",
    "total_budget_usd": "...",
    "distribution": "..."
  },
  "landing_strategy": "...",
  "kpis": ["..."],
  "warnings": ["..."]
}`
}

// ── NUEVOS TONOS ──────────────────────────────────────────────────────
// Centrados en la relación con el médico, no en el producto
const TONE_CONTEXT: Record<string, string> = {
  premium:       'Tono: premium y aspiracional. Como si Apple diseñara para médicos. Silencioso, elegante, preciso.',
  founder:       'Tono: founder auténtico. Primera persona, honesto, con propósito. Inspira sin vender.',
  cercano:       'Tono: cercano y humano. Habla como un colega que entiende el día a día del médico. Empático, directo.',
  transformador: 'Tono: transformador y específico. Muestra cambios concretos. Sin hype. Con datos y realismo.'
}

// ── NUEVOS ÁNGULOS — mundo del médico, no features del producto ───────
const ANGLE_CONTEXT: Record<string, string> = {
  reputacion:    'Ángulo: la reputación del médico. Cómo se percibe su práctica online antes de que el paciente llegue.',
  tiempo:        'Ángulo: tiempo y admin. El médico pierde horas de medicina en gestión que no aporta valor.',
  percepcion:    'Ángulo: cómo el paciente percibe al médico. La primera impresión digital importa más que nunca.',
  competencia:   'Ángulo: la competencia. Hay médicos que ya se adaptaron. Los que no, están perdiendo pacientes sin saberlo.',
  futuro:        'Ángulo: el futuro de la práctica privada. Qué médicos van a crecer en los próximos 5 años y por qué.',
  custom:        ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: cors })
  }

  const growthKey = req.headers.get('x-growth-key') || ''
  if (growthKey !== Deno.env.get('GROWTH_ADMIN_KEY')) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: cors })
  }

  // Un solo actor de confianza (quien tiene GROWTH_ADMIN_KEY) -- key fija,
  // el limite es fusible, no defensa contra un tercero externo.
  const rl = await checkRateLimit('generate_citadoc_content', null, 'system')
  if (!rl.allowed) {
    return new Response(JSON.stringify({ ok: false, error: rl.reason }), { status: 429, headers: cors })
  }

  try {
    const {
      type = 'carousel_edu', tone = 'premium', angle = 'reputacion',
      custom_angle = '', platform = 'instagram',
      campaign_specialty = 'médicos especialistas', campaign_city = 'Ecuador',
      campaign_budget = '10', campaign_objective = 'registros'
    } = await req.json()

    const isCampaign = type === 'campaign'

    const typePrompt = isCampaign
      ? `${PROMPTS.campaign}\n\nPARÁMETROS:\n- Nicho: ${campaign_specialty}\n- Ciudad: ${campaign_city}\n- Presupuesto: $${campaign_budget} USD/día\n- Objetivo: ${campaign_objective}`
      : (PROMPTS[type] || PROMPTS.carousel_edu)

    const toneCtx  = TONE_CONTEXT[tone] || TONE_CONTEXT.premium
    const angleCtx = angle === 'custom' ? `Ángulo narrativo: ${custom_angle}` : (ANGLE_CONTEXT[angle] || '')

    const systemPrompt = isCampaign
      ? `Eres un experto en Meta Ads para healthtech en LATAM.\nContexto:\n${BRAND_CONTEXT}\nRESPONDE SOLO en JSON válido. Sin markdown. Sin texto fuera del JSON.`
      : `Eres el director editorial de CitaDoc — una marca que habla CON médicos, no SOBRE software.

FILOSOFÍA EDITORIAL:
- El médico es el héroe. CitaDoc es la infraestructura.
- 5 piezas de valor por cada 1 showcase directo.
- Nunca suenes como anuncio. Siempre como contenido que un médico guardaría.
- Conecta con aspiraciones reales: reputación, crecimiento, modernidad, status profesional.

CONTEXTO:
${BRAND_CONTEXT}

${toneCtx}
${angleCtx ? '\n' + angleCtx : ''}

REGLAS:
- NUNCA: "plataforma robusta", "solución integral", "herramienta poderosa"
- NUNCA: hablar de CitaDoc antes de hablar del médico
- SÍ: lenguaje moderno, directo, emocional y específico
- SÍ: conectar con la realidad diaria del médico
- Plataforma: ${platform}

RESPONDE SOLO en JSON válido. Sin markdown. Sin texto fuera del JSON.`

    const kimiRes = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KIMI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: typePrompt }
        ],
        temperature: 0.82,
        max_tokens: 2200
      })
    })

    if (!kimiRes.ok) {
      const errText = await kimiRes.text()
      throw new Error(`Kimi error ${kimiRes.status}: ${errText}`)
    }

    const kimiData = await kimiRes.json()
    const raw = kimiData.choices?.[0]?.message?.content || ''

    let content: Record<string, unknown>
    try {
      const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
      content = JSON.parse(cleaned)
    } catch {
      content = { raw_output: raw }
    }

    return new Response(JSON.stringify({ ok: true, type, content }), { headers: cors })

  } catch(err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: cors })
  }
})
