import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-growth-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const KIMI_URL   = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const BRAND_CONTEXT = `CitaDoc es una plataforma clínica premium para médicos en LATAM.
Propuesta de valor: gestión de agenda + pacientes + historia clínica estructurada (SOAP) + perfil web médico generado por IA + booking online.
Diferenciadores: mobile-first, diseño premium, AI integrado al workflow clínico, multi-sede, multi-especialidad.
Target principal: médicos especialistas con consulta privada que todavía usan WhatsApp/Excel/papel para gestionar su agenda.
Posicionamiento: NO "software médico genérico". SÍ "la capa AI premium del médico moderno".
Mercado: Ecuador → LATAM.`

const PROMPTS: Record<string, string> = {
  reel: `Genera el guión completo de un reel de 30-45 segundos para promover CitaDoc a médicos.

RESPONDE EN JSON:
{
  "hook": "texto de apertura (primeros 3 segundos, impacto inmediato)",
  "script": "guión narrado completo con indicaciones visuales entre [corchetes]",
  "caption": "caption de Instagram/TikTok con hook + cuerpo + hashtags (máx 5)",
  "cta": "llamado a la acción final del video"
}`,

  carousel: `Genera un carousel de 6 slides para LinkedIn/Instagram promoviendo CitaDoc a médicos.

RESPONDE EN JSON:
{
  "slides": [
    {"num": 1, "headline": "hook principal", "subtext": "apoyo visual"},
    {"num": 2, "headline": "...", "subtext": "..."},
    {"num": 3, "headline": "...", "subtext": "..."},
    {"num": 4, "headline": "...", "subtext": "..."},
    {"num": 5, "headline": "...", "subtext": "..."},
    {"num": 6, "headline": "CTA slide", "subtext": "acción a tomar"}
  ],
  "caption": "caption que acompaña el carousel"
}`,

  founder: `Genera un post estilo founder auténtico para LinkedIn. Voz personal, historia real de por qué se construyó CitaDoc y qué problema médico resuelve.

RESPONDE EN JSON:
{
  "post": "post completo listo para publicar en LinkedIn (4-6 párrafos cortos, estilo founder moderno)",
  "hook": "primera línea que detiene el scroll"
}`,

  ad: `Genera copy de anuncio pago para Facebook/Instagram Ads dirigido a médicos especialistas.

RESPONDE EN JSON:
{
  "headline": "título principal (máx 40 caracteres)",
  "subheadline": "subtítulo de apoyo (máx 60 caracteres)",
  "body": "cuerpo del anuncio (3-4 líneas directas, benefit-first)",
  "cta_button": "texto del botón (máx 20 caracteres)",
  "target_note": "nota breve sobre el targeting recomendado para este anuncio"
}`,

  caption: `Genera un caption standalone premium para Instagram o LinkedIn promoviendo CitaDoc.

RESPONDE EN JSON:
{
  "caption_instagram": "caption Instagram con hook fuerte + cuerpo + hashtags (máx 5)",
  "caption_linkedin": "versión adaptada para LinkedIn (más narrativa, sin hashtags excesivos)"
}`,

  campaign: `Eres un experto en Meta Ads (Facebook e Instagram) para campañas B2B en LATAM.
Genera una campaña completa de Meta Ads para adquirir médicos especialistas para CitaDoc.
Usa los parámetros recibidos (nicho, ciudad, presupuesto, objetivo).

RESPONDE EN JSON:
{
  "campaign_name": "nombre sugerido para la campaña en Ads Manager",
  "objective": "objetivo de campaña Meta recomendado (LEAD_GENERATION / CONVERSIONS / REACH)",
  "audience": {
    "age_range": "rango de edad sugerido",
    "gender": "all / men / women",
    "locations": ["ciudades o regiones exactas"],
    "interests": ["intereses exactos a targetear en Meta"],
    "behaviors": ["comportamientos de Meta relevantes"],
    "exclusions": ["qué excluir del targeting"]
  },
  "ad_variants": [
    {
      "variant": "A",
      "format": "imagen o video",
      "headline": "título del anuncio (máx 40 caracteres)",
      "primary_text": "texto principal (3-4 líneas directas)",
      "description": "descripción secundaria (máx 30 caracteres)",
      "cta_button": "texto del botón",
      "visual_brief": "descripción exacta del visual: colores, composición, texto en imagen, estilo"
    },
    {
      "variant": "B",
      "format": "imagen o video",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta_button": "...",
      "visual_brief": "..."
    },
    {
      "variant": "C",
      "format": "imagen o video",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta_button": "...",
      "visual_brief": "..."
    }
  ],
  "budget": {
    "daily_budget_usd": "presupuesto diario sugerido en USD",
    "duration_days": "duración recomendada",
    "total_budget_usd": "presupuesto total",
    "distribution": "cómo distribuir entre variantes"
  },
  "landing_strategy": "qué debe pasar cuando el médico hace clic (landing page, formulario, DM)",
  "kpis": ["métricas clave a monitorear"],
  "warnings": ["advertencias sobre políticas de Meta Ads en salud/medicina a tener en cuenta"]
}`
}

const TONE_CONTEXT: Record<string, string> = {
  premium:    'Tono: aspiracional y premium. Evoca modernidad, prestigio, excelencia clínica. Como Apple o Linear pero en salud.',
  founder:    'Tono: founder auténtico. Primera persona, honesto, con propósito claro. Inspira sin vender directamente.',
  emocional:  'Tono: emocional y clínico. Conecta con lo que el médico siente (frustración, orgullo, vocación). Humaniza el producto.',
  antelegacy: 'Tono: contraste directo. Muestra el antes (caos, Excel, WhatsApp, papel) vs el después (CitaDoc). Sin atacar a nadie, solo contrastando realidades.'
}

const ANGLE_CONTEXT: Record<string, string> = {
  agenda:     'Ángulo: la agenda y el tiempo. Los médicos pierden horas en gestión que no es medicina.',
  experiencia:'Ángulo: la experiencia del paciente. La consulta moderna empieza antes de que el paciente llegue.',
  prestigio:  'Ángulo: el prestigio digital. Tu perfil online es tu primera consulta.',
  eficiencia: 'Ángulo: eficiencia clínica. Dictado por voz, historia clínica estructurada, menos papeleo.',
  custom:     ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: cors })
  }

  // Simple key auth — no Supabase JWT needed for this internal tool
  const growthKey = req.headers.get('x-growth-key') || ''
  if (growthKey !== Deno.env.get('GROWTH_ADMIN_KEY')) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: cors })
  }

  try {
    const {
      type = 'caption', tone = 'premium', angle = 'agenda',
      custom_angle = '', platform = 'instagram',
      // campaign-specific
      campaign_specialty = 'médicos especialistas', campaign_city = 'Ecuador',
      campaign_budget = '10', campaign_objective = 'registros'
    } = await req.json()

    const isCampaign = type === 'campaign'

    const typePrompt = isCampaign
      ? `${PROMPTS.campaign}\n\nPARÁMETROS DE CAMPAÑA:\n- Nicho: ${campaign_specialty}\n- Ciudad/región: ${campaign_city}\n- Presupuesto total disponible: $${campaign_budget} USD/día\n- Objetivo principal: ${campaign_objective}`
      : (PROMPTS[type] || PROMPTS.caption)

    const toneCtx   = TONE_CONTEXT[tone] || TONE_CONTEXT.premium
    const angleCtx  = angle === 'custom' ? `Ángulo: ${custom_angle}` : (ANGLE_CONTEXT[angle] || '')

    const systemPrompt = isCampaign
      ? `Eres un experto en Meta Ads y marketing B2B para healthtech en LATAM.\nContexto de marca:\n${BRAND_CONTEXT}\nRESPONDE SOLO en JSON válido. Sin markdown. Sin texto fuera del JSON.`
      : `Eres el director creativo de CitaDoc, una startup healthtech premium de LATAM.
Tu trabajo: crear contenido de marketing auténtico, premium y diferenciado que atraiga médicos especialistas a la plataforma.

CONTEXTO DE MARCA:
${BRAND_CONTEXT}

${toneCtx}
${angleCtx}

REGLAS ABSOLUTAS:
- NUNCA suenes como "software médico genérico" ni como publicidad corporativa
- NUNCA uses frases como "solución integral", "plataforma robusta", "herramienta poderosa"
- SÍ usa lenguaje moderno, directo, con confianza
- SÍ conecta emocionalmente con la realidad del médico
- El contenido debe sentirse hecho por una startup real, no por una agencia
- Plataforma de publicación principal: ${platform}

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
          { role: 'user', content: typePrompt }
        ],
        temperature: 0.85,
        max_tokens: 2500
      })
    })

    if (!kimiRes.ok) {
      const err = await kimiRes.text()
      return new Response(JSON.stringify({ ok: false, error: 'kimi_error', detail: err }), { status: 502, headers: cors })
    }

    const kimiData = await kimiRes.json()
    const raw = (kimiData.choices?.[0]?.message?.content || '').trim()

    let content: any
    try {
      content = JSON.parse(raw)
    } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('invalid_json_response')
      content = JSON.parse(match[0])
    }

    return new Response(JSON.stringify({ ok: true, type, tone, angle, content }), { headers: cors })

  } catch (e) {
    console.error('[citadoc-content]', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors })
  }
})
