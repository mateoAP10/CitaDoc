import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const KIMI_API_KEY         = Deno.env.get('KIMI_API_KEY') || ''
const SEND_EMAIL_URL       = `${SUPABASE_URL}/functions/v1/send-email`

type OnboardingState = 'NEW_EMPTY' | 'NEW_PARTIAL' | 'HIGH_INTENT' | 'LIKELY_PRO'

interface Medico {
  id: string
  email: string
  nombre: string
  apellido: string
  titulo: string | null
  foto_url: string | null
  bio: string | null
  especialidades: string[] | null
  subespecialidad: string | null
  ciudad: string | null
  precio: number | null
  whatsapp: string | null
  slug: string | null
  activo: boolean
  growth_agent_fired_at: string | null
}

function scoreOnboarding(m: Medico): OnboardingState {
  const hasPhoto = !!m.foto_url
  const hasBio   = !!(m.bio && m.bio.trim().length > 20)
  const hasEsp   = !!(m.especialidades && m.especialidades.length > 0)
  const hasPrecio = !!m.precio

  if (!hasPhoto && !hasBio && !hasEsp) return 'NEW_EMPTY'
  if (hasEsp && !hasPhoto && !hasBio)  return 'NEW_PARTIAL'
  if (hasPhoto && hasEsp && !hasBio)   return 'HIGH_INTENT'
  if (hasPhoto && hasEsp && hasBio && hasPrecio) return 'LIKELY_PRO'
  return 'NEW_PARTIAL'
}

async function generateBio(m: Medico): Promise<string | null> {
  if (!KIMI_API_KEY) return null
  const esp    = (m.especialidades || [])[0] || m.subespecialidad || 'medicina'
  const ciudad = m.ciudad || ''
  const nombre = `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`

  try {
    const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Escribe una bio profesional de 2-3 oraciones para ${nombre}, especialista en ${esp}${ciudad ? ' con consulta en ' + ciudad : ''}.

Reglas estrictas:
- Usa al menos una frase o metáfora que evoque directamente la especialidad (ej. cardiología → "cada latido importa", dermatología → "la piel tiene memoria", pediatría → "crecer bien es un arte")
- Tono: cálido, seguro, humano — como alguien que inspira confianza desde la primera palabra
- Evita frases genéricas como "amplia experiencia" o "atención personalizada"
- Nada de comillas, asteriscos ni formato — solo texto corrido listo para publicar`
        }]
      })
    })
    const data = await resp.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  try {
    const { medico_id } = await req.json()
    if (!medico_id) return new Response(JSON.stringify({ error: 'missing medico_id' }), { status: 400 })

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: m, error } = await sb
      .from('medicos')
      .select('*')
      .eq('id', medico_id)
      .single()

    if (error || !m) return new Response(JSON.stringify({ error: 'medico not found' }), { status: 404 })

    // Idempotency guard — never fire twice for the same doctor
    if (m.growth_agent_fired_at) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const state          = scoreOnboarding(m)
    const nombreCompleto = `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`

    // Generate bio if empty — medical branding via AI
    let generatedBio: string | null = null
    if (!m.bio || m.bio.trim().length < 20) {
      generatedBio = await generateBio(m)
      if (generatedBio) {
        await sb.from('medicos').update({ bio: generatedBio }).eq('id', medico_id)
      }
    }

    // Mark agent as fired + persist onboarding state
    await sb.from('medicos').update({
      onboarding_state:      state,
      growth_agent_fired_at: new Date().toISOString(),
    }).eq('id', medico_id)

    // Immediate personalized welcome email
    if (m.email) {
      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          type:             'growth_welcome',
          to_email:         m.email,
          medico_nombre:    nombreCompleto,
          onboarding_state: state,
          bio_generada:     generatedBio,
          medico_slug:      m.slug || '',
        }),
      }).catch(() => {})
    }

    // Log the growth event
    await sb.from('growth_events').insert({
      medico_id,
      event_type:       'doctor.created',
      onboarding_state: state,
      metadata: {
        has_foto:      !!m.foto_url,
        has_bio:       !!(m.bio || generatedBio),
        has_esp:       !!(m.especialidades?.length),
        has_precio:    !!m.precio,
        has_whatsapp:  !!m.whatsapp,
        bio_generated: !!generatedBio,
      },
    })

    return new Response(JSON.stringify({ ok: true, state, bio_generated: !!generatedBio }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
