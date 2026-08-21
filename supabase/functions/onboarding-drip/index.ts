import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-A2.4 -- funcion exclusivamente batch, sin caso de uso publico. Sin
// auth (verify_jwt=false, sin chequeo propio, sin chequeo de metodo -- el
// handler ni siquiera leia `req`) mandaba emails reales day2/day5 y
// mutaba onboarding_emails_sent en cada invocacion. Unico caller
// legitimo: pg_cron (job "onboarding-drip-daily"). El header
// Authorization del cron ("Bearer |") era texto muerto -- ni el gateway
// (verify_jwt=false) ni el codigo (no leia `req`) lo evaluaban nunca.

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL    = `${SUPABASE_URL}/functions/v1/send-email`

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()

    const steps = [
      {
        key: 'day2',
        type: 'onboarding_day2',
        minHours: 40,  // ~day 2
        maxHours: 64,  // ~day 3
      },
      {
        key: 'day5',
        type: 'onboarding_day5',
        minHours: 112, // ~day 5
        maxHours: 136, // ~day 6
      },
    ]

    let totalSent = 0

    for (const step of steps) {
      const windowEnd   = new Date(now.getTime() - step.minHours * 3_600_000)
      const windowStart = new Date(now.getTime() - step.maxHours * 3_600_000)

      const { data: candidates } = await sb
        .from('medicos')
        .select('id, email, nombre, titulo, slug, onboarding_emails_sent')
        .gte('created_at', windowStart.toISOString())
        .lt('created_at', windowEnd.toISOString())

      for (const m of candidates || []) {
        const sent = (m.onboarding_emails_sent || []) as string[]
        if (sent.includes(step.key)) continue

        await fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            type: step.type,
            to_email: m.email,
            nombre: m.nombre,
            titulo: m.titulo,
            slug: m.slug,
          }),
        }).catch(() => {})

        await sb
          .from('medicos')
          .update({ onboarding_emails_sent: [...sent, step.key] })
          .eq('id', m.id)

        totalSent++
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
