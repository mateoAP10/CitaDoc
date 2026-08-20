import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// ── CRUD administrativo de Doctor Center: pacientes + citas (P2.2-A, 20 ago
// 2026) + lab_orders/lab_order_items/lab_liquidaciones (P2.2-B, 20 ago
// 2026) ──────────────────────────────────────────────────────────────────
// Reemplaza los sbGet/sbPost/sbPatch directos con anon key que
// doctor-center-admin.html hacía contra estas tablas -- todas tenían RLS
// habilitado pero con una policy ALL(qual:true) para {public}. Ahora sin
// policies (ver migraciones 20260820_center_patients_citas_lockdown.sql y
// 20260820_lab_orders_liquidaciones_lockdown.sql). Solo admin_users real,
// vía JWT (requireAdmin()), igual que el resto del stack admin.
//
// Superficie de confianza separada de center-booking (pública, sin auth,
// solo find-or-create + insert de cita para el flujo de reserva del
// paciente) -- esta función es exclusivamente para el panel de gestión.
//
// P2.2-B toca dinero real (órdenes de laboratorio, comisiones, pagos) --
// además del whitelist de campos, valida que las relaciones entre
// entidades sean coherentes: patient_id/medico_id deben pertenecer al
// mismo center_id que la operación, order_id debe ser una orden real
// existente. Los totales/comisiones (total_precio_final, valor_lab,
// ganancia_dres, ganancia_dc, monto) siguen viniendo del cliente, igual
// que hoy -- ese cálculo ya vivía en el JS del panel antes de este
// cambio, no es parte de lo que este bloque decidió tocar.

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

const LAB_ORDER_CREATE_FIELDS = [
  'center_id', 'patient_id', 'medico_id', 'notas', 'fecha_estudio', 'hora_estudio',
  'total_precio_final', 'total_valor_lab', 'total_ganancia_dres', 'total_ganancia_dc',
] as const
const LAB_ORDER_UPDATE_FIELDS = [
  'estado', 'notas', 'fecha_estudio', 'hora_estudio', 'lab_pagado', 'medico_pagado',
  'email_realizado_at', 'email_cancelado_at',
] as const
const LAB_ORDER_ITEM_CREATE_FIELDS = [
  'order_id', 'exam_id', 'descripcion', 'valor_lab', 'precio_final', 'ganancia_dres', 'ganancia_dc',
] as const
const LAB_LIQUIDACION_CREATE_FIELDS = ['center_id', 'tipo', 'medico_id', 'monto', 'fecha', 'notas'] as const

function pick(src: Record<string, unknown>, fields: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const f of fields) if (f in src) out[f] = src[f]
  return out
}

// medico_id (si viene) debe ser un médico real asociado a ESE center_id --
// evita que una orden/liquidación quede apuntando a un médico ajeno al
// centro, o a un id inventado.
async function medicoPerteneceACentro(medicoId: unknown, centerId: unknown): Promise<boolean> {
  if (!medicoId) return true
  const { data, error } = await sb.from('center_doctors').select('medico_id')
    .eq('center_id', centerId as string).eq('medico_id', medicoId as string).maybeSingle()
  return !error && !!data
}

// patient_id debe pertenecer al mismo center_id -- evita crear una orden
// para el centro A usando un paciente que en realidad es del centro B.
async function patientPerteneceACentro(patientId: unknown, centerId: unknown): Promise<boolean> {
  if (!patientId) return false
  const { data, error } = await sb.from('center_patients').select('id')
    .eq('id', patientId as string).eq('center_id', centerId as string).maybeSingle()
  return !error && !!data
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

      // ── Lab orders (P2.2-B) ─────────────────────────────────────────────
      case 'list_lab_orders': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('lab_orders').select('*')
          .eq('center_id', body.center_id).order('created_at', { ascending: false }).limit(100)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, orders: data || [] }), { headers: CORS })
      }

      case 'create_lab_order': {
        const patch = pick(body.patch || {}, LAB_ORDER_CREATE_FIELDS)
        if (!patch.center_id || !patch.patient_id) return fail(400, 'center_id y patient_id son requeridos')
        if (!(await patientPerteneceACentro(patch.patient_id, patch.center_id))) {
          return fail(400, 'patient_id no pertenece a ese center_id')
        }
        if (!(await medicoPerteneceACentro(patch.medico_id, patch.center_id))) {
          return fail(400, 'medico_id no pertenece a ese center_id')
        }
        const { data, error } = await sb.from('lab_orders').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, order: data }), { headers: CORS })
      }

      case 'update_lab_order': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, LAB_ORDER_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { error } = await sb.from('lab_orders').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      // ── Lab order items ──────────────────────────────────────────────────
      case 'list_lab_order_items': {
        const orderIds: string[] = Array.isArray(body.order_ids) ? body.order_ids : (body.order_id ? [body.order_id] : [])
        if (!orderIds.length) return fail(400, 'order_id u order_ids requerido')
        const { data, error } = await sb.from('lab_order_items').select('*').in('order_id', orderIds)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, items: data || [] }), { headers: CORS })
      }

      case 'create_lab_order_item': {
        const patch = pick(body.patch || {}, LAB_ORDER_ITEM_CREATE_FIELDS)
        if (!patch.order_id) return fail(400, 'order_id requerido')
        // order_id debe corresponder a una orden real -- evita items huérfanos
        // o apuntando a una orden inventada.
        const { data: order, error: orderErr } = await sb.from('lab_orders').select('id').eq('id', patch.order_id).maybeSingle()
        if (orderErr || !order) return fail(400, 'order_id no corresponde a una orden válida')
        const { data, error } = await sb.from('lab_order_items').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, item: data }), { headers: CORS })
      }

      // ── Liquidaciones ─────────────────────────────────────────────────────
      case 'list_lab_liquidaciones': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        let q = sb.from('lab_liquidaciones').select('*').eq('center_id', body.center_id).order('created_at', { ascending: false })
        if (body.tipo) q = q.eq('tipo', body.tipo)
        if (body.limit) q = q.limit(Number(body.limit))
        const { data, error } = await q
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, liquidaciones: data || [] }), { headers: CORS })
      }

      case 'create_lab_liquidacion': {
        const patch = pick(body.patch || {}, LAB_LIQUIDACION_CREATE_FIELDS)
        if (!patch.center_id || !patch.tipo || typeof patch.monto !== 'number') {
          return fail(400, 'center_id, tipo y monto son requeridos')
        }
        if (!(await medicoPerteneceACentro(patch.medico_id, patch.center_id))) {
          return fail(400, 'medico_id no pertenece a ese center_id')
        }
        const { data, error } = await sb.from('lab_liquidaciones').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, liquidacion: data }), { headers: CORS })
      }

      default:
        return fail(400, 'acción desconocida')
    }
  } catch (e) {
    console.error('[admin-center-crud]', e)
    return fail(500, 'error interno')
  }
})
