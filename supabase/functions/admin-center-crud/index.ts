import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// ── CRUD administrativo de Doctor Center: pacientes + citas (P2.2-A, 20 ago
// 2026) ──────────────────────────────────────────────────────────────────
// Reemplaza los sbGet/sbPost/sbPatch directos con anon key que
// doctor-center-admin.html hacía contra center_patients/center_citas --
// esas tablas ahora tienen RLS sin policies para anon/authenticated (ver
// migración 20260820_center_patients_citas_lockdown.sql). Solo admin_users
// real, vía JWT (requireAdmin()), igual que el resto del stack admin.
//
// Superficie de confianza separada de center-booking (pública, sin auth,
// solo find-or-create + insert de cita para el flujo de reserva del
// paciente) -- esta función es exclusivamente para el panel de gestión.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
}

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}

const PATIENT_CREATE_FIELDS = ['center_id', 'nombre', 'telefono', 'email', 'cedula', 'canal'] as const
const PATIENT_UPDATE_FIELDS = ['nombre', 'telefono', 'email', 'cedula', 'canal'] as const

const CITA_CREATE_FIELDS = [
  'center_id', 'patient_id', 'fecha_pref', 'hora', 'nota', 'canal', 'servicios',
  'total_est', 'followup_confirm_sent', 'email_confirm_at',
] as const
const CITA_UPDATE_FIELDS = [
  'atendido', 'estado', 'nota', 'fecha_pref', 'hora', 'servicios', 'total_est', 'canal',
  'email_confirm_at', 'email_reminder_at', 'email_noshow_at', 'email_postvista_at',
  'email_reminder_3h_at', 'patient_confirmed', 'patient_confirmed_at',
  'followup_confirm_sent', 'followup_reminder_sent', 'followup_noshow_sent', 'followup_postvista_sent',
] as const

function pick(src: Record<string, unknown>, fields: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const f of fields) if (f in src) out[f] = src[f]
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  const auth = await requireAdmin(req)
  if (!auth.ok) return fail(auth.status, auth.error)

  let body: any
  try { body = await req.json() } catch { return fail(400, 'JSON inválido') }

  const action = (body.action || '').toString()

  try {
    switch (action) {
      case 'list_patients': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_patients').select('*')
          .eq('center_id', body.center_id).order('created_at', { ascending: false }).limit(500)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, patients: data || [] }), { headers: CORS })
      }

      case 'list_citas': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_citas')
          .select('id,patient_id,fecha_pref,hora,atendido,estado,total_est,servicios,nota,patient_confirmed,email_confirm_at,email_reminder_at,email_noshow_at,email_postvista_at')
          .eq('center_id', body.center_id).order('fecha_pref', { ascending: false }).limit(1000)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, citas: data || [] }), { headers: CORS })
      }

      case 'find_patient': {
        if (!body.center_id || (!body.email && !body.cedula)) return fail(400, 'center_id y email o cedula requeridos')
        const q = sb.from('center_patients').select('id,nombre,email,telefono,cedula').eq('center_id', body.center_id).limit(1)
        const { data, error } = body.email ? await q.eq('email', body.email) : await q.eq('cedula', body.cedula)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, patient: (data && data[0]) || null }), { headers: CORS })
      }

      case 'get_patient': {
        if (!body.id) return fail(400, 'id requerido')
        const { data, error } = await sb.from('center_patients').select('id,nombre,email,telefono').eq('id', body.id).maybeSingle()
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, patient: data || null }), { headers: CORS })
      }

      case 'get_cita': {
        if (!body.id) return fail(400, 'id requerido')
        const cols = (body.select as string) || '*'
        const { data, error } = await sb.from('center_citas').select(cols).eq('id', body.id).maybeSingle()
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, cita: data || null }), { headers: CORS })
      }

      case 'create_patient': {
        const patch = pick(body.patch || {}, PATIENT_CREATE_FIELDS)
        if (!patch.center_id || !patch.nombre) return fail(400, 'center_id y nombre son requeridos')
        const { data, error } = await sb.from('center_patients').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, patient: data }), { headers: CORS })
      }

      case 'update_patient': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, PATIENT_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { error } = await sb.from('center_patients').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      case 'delete_patient': {
        if (!body.id) return fail(400, 'id requerido')
        const { error } = await sb.from('center_patients').delete().eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      case 'create_cita': {
        const patch = pick(body.patch || {}, CITA_CREATE_FIELDS)
        if (!patch.center_id || !patch.patient_id) return fail(400, 'center_id y patient_id son requeridos')
        const { data, error } = await sb.from('center_citas').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, cita: data }), { headers: CORS })
      }

      case 'update_cita': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, CITA_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { error } = await sb.from('center_citas').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      default:
        return fail(400, 'acción desconocida')
    }
  } catch (e) {
    console.error('[admin-center-crud]', e)
    return fail(500, 'error interno')
  }
})
