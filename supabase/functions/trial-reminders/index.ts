import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`

Deno.serve(async (req) => {
  // Allow manual trigger via POST (for testing) or scheduled
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const now = new Date()

    // 1. Expire trials that have passed trial_ends_at
    const { data: expired } = await sb
      .from('medicos')
      .update({ subscription_status: 'expired', plan_activo: false })
      .eq('subscription_status', 'trialing')
      .lt('trial_ends_at', now.toISOString())
      .select('email, nombre, titulo')

    for (const m of expired || []) {
      await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ type: 'trial_expired', to_email: m.email, nombre: m.nombre, titulo: m.titulo })
      }).catch(() => {})
    }

    // 2. Send reminders at day 20, 25, 29 (10, 5, 1 days left)
    const reminders = [
      { daysLeft: 10, key: 'day20', type: 'trial_reminder_20' },
      { daysLeft: 5,  key: 'day25', type: 'trial_reminder_25' },
      { daysLeft: 1,  key: 'day29', type: 'trial_reminder_29' },
    ]

    let sent = 0

    for (const { daysLeft, key, type } of reminders) {
      const windowStart = new Date(now.getTime() + daysLeft * 864e5)
      const windowEnd   = new Date(windowStart.getTime() + 864e5)

      const { data: candidates } = await sb
        .from('medicos')
        .select('id, email, nombre, titulo, trial_ends_at, trial_reminders_sent')
        .eq('subscription_status', 'trialing')
        .gte('trial_ends_at', windowStart.toISOString())
        .lt('trial_ends_at', windowEnd.toISOString())

      for (const m of candidates || []) {
        const alreadySent = (m.trial_reminders_sent || []).includes(key)
        if (alreadySent) continue

        await fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ type, to_email: m.email, nombre: m.nombre, titulo: m.titulo, trial_ends_at: m.trial_ends_at })
        }).catch(() => {})

        await sb
          .from('medicos')
          .update({ trial_reminders_sent: [...(m.trial_reminders_sent || []), key] })
          .eq('id', m.id)

        sent++
      }
    }

    return new Response(JSON.stringify({ ok: true, expired: expired?.length || 0, reminders_sent: sent }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('[trial-reminders]', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
