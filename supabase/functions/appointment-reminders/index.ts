import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-A2.2 -- funcion exclusivamente batch, sin caso de uso publico. Sin
// auth (verify_jwt=false, sin chequeo propio) leia citas de TODOS los
// medicos (nombre/email de paciente) y mandaba emails reales. Unico
// caller legitimo: pg_cron (job "appointment-reminders"), sin
// Authorization hoy.

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY)

const PRO_PLANS = ['pro', 'destacado', 'pro_web']

function timeAhead(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16)
}

async function processWindow(
  flagField: 'reminder_sent' | 'reminder_3h_sent',
  emailType: 'reminder' | 'reminder_3h',
  windowMin: number,
  windowMax: number,
): Promise<{ sent: number; failed: number }> {
  const { data: citas, error } = await sb
    .from('citas')
    .select(`
      id, fecha, hora, paciente_nombre, paciente_email, modalidad,
      medico_id,
      medicos ( titulo, nombre, apellido, slug, plan )
    `)
    .eq('estado', 'confirmada')
    .eq(flagField, false)
    .not('paciente_email', 'is', null)
    .filter('fecha::text || \' \' || hora', 'gte', timeAhead(windowMin))
    .filter('fecha::text || \' \' || hora', 'lte', timeAhead(windowMax))

  if (error) {
    console.error(`[reminders/${emailType}] Query error:`, error)
    return { sent: 0, failed: 0 }
  }

  if (!citas?.length) return { sent: 0, failed: 0 }

  console.log(`[reminders/${emailType}] Found`, citas.length)

  const results = await Promise.allSettled(citas.map(async (cita) => {
    // deno-lint-ignore no-explicit-any
    const medico = (cita as any).medicos
    if (!PRO_PLANS.includes(medico?.plan)) {
      await sb.from('citas').update({ [flagField]: true }).eq('id', cita.id)
      return
    }

    const doctorName = medico
      ? `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}`.trim()
      : 'tu médico'
    const fecha = new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    const modalidad = cita.modalidad === 'virtual' ? '💻 Virtual' : '🏥 Presencial'

    const res = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:             emailType,
        to_email:         cita.paciente_email,
        doctor_name:      doctorName,
        patient_name:     cita.paciente_nombre,
        appointment_date: fecha,
        appointment_time: cita.hora,
        appointment_mode: modalidad,
        cita_id:          cita.id,
      }),
    })

    if (!res.ok) throw new Error(`send-email failed: ${res.status}`)
    await sb.from('citas').update({ [flagField]: true }).eq('id', cita.id)
    console.log(`[reminders/${emailType}] Sent:`, cita.id)
  }))

  return {
    sent:   results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  }
}

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
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
    const [r12h, r3h] = await Promise.all([
      processWindow('reminder_sent',    'reminder',    11.5, 12.5),
      processWindow('reminder_3h_sent', 'reminder_3h', 2.5,  3.5),
    ])

    const failed = r12h.failed + r3h.failed
    if (failed > 0) console.warn('[reminders] Failed:', failed)

    return new Response(JSON.stringify({
      ok: true,
      reminder_12h: r12h.sent,
      reminder_3h:  r3h.sent,
      failed,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (e) {
    console.error('[reminders] Error:', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })
  }
})
