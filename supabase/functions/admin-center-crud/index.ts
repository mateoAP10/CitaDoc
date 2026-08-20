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
//
// P2.2-C3 (20 ago 2026): center_website/center_website_services --
// mismo patrón, con dos particularidades. update_center_website es un
// upsert atómico (constraint UNIQUE en center_id, vía .upsert() nativo).
// replace_center_website_services replica el patrón actual del cliente
// (DELETE todo + INSERT uno por uno) pero server-side y atómico -- llama
// a la función de Postgres replace_center_website_services() (una sola
// invocación = una sola transacción implícita), y ADEMÁS valida que cada
// elemento del array tenga únicamente campos del whitelist, rechazando
// (no ignorando) cualquier campo desconocido antes de llegar a la RPC.
// center_website_testimonials NO tiene acciones acá -- sin consumidor de
// escritura en todo el repo, confirmado dos veces en la auditoría.

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

const LAB_EXAM_CREATE_FIELDS = [
  'center_id', 'descripcion', 'categoria', 'valor_lab', 'precio_final', 'ganancia_dres', 'ganancia_dc',
] as const
const LAB_EXAM_UPDATE_FIELDS = [
  'descripcion', 'categoria', 'valor_lab', 'precio_final', 'ganancia_dres', 'ganancia_dc', 'activo',
] as const

// P2.2-C2: centers -- solo update, nunca create/delete (un solo centro en
// producción, sin UI para crear/borrar). id/created_at/slug/activo/
// color_primary deliberadamente fuera -- el panel de hoy nunca los toca.
const CENTER_UPDATE_FIELDS = [
  'portada_url', 'portada_filter', 'portada_blur', 'logo_size', 'logo_url',
  'chip1', 'chip2', 'chip3', 'maps_url', 'nombre', 'telefono', 'email', 'ciudad',
  'instagram', 'direccion', 'tagline', 'descripcion', 'whatsapp', 'seguros', 'schedule_config',
] as const

// center_services -- sin update, no existe esa capacidad hoy (solo alta y baja).
const CENTER_SERVICE_CREATE_FIELDS = ['center_id', 'nombre', 'categoria', 'precio', 'booking_type', 'orden', 'seguros'] as const

// center_packages
const CENTER_PACKAGE_CREATE_FIELDS = ['center_id', 'nombre', 'categoria', 'descripcion', 'incluye', 'precio_regular', 'precio_promo', 'icono', 'color', 'activo'] as const
const CENTER_PACKAGE_UPDATE_FIELDS = ['nombre', 'categoria', 'descripcion', 'incluye', 'precio_regular', 'precio_promo', 'icono', 'color', 'activo'] as const

// P2.2-C3: center_website -- exactamente los campos que sw2Save() ya manda
// hoy, ni uno más (email_contact/address existen en la tabla pero el
// panel nunca los usa). published queda adentro del whitelist a propósito
// -- sw2TogglePublish() solo lo cambia en memoria, se persiste recién en
// el próximo guardado general, igual que hoy.
const CENTER_WEBSITE_UPDATE_FIELDS = [
  'template_id', 'theme', 'primary_color', 'logo_url', 'logo_size', 'doctor_photo_url',
  'hero_question', 'hero_headline', 'hero_tagline', 'doctor_name', 'doctor_specialty',
  'doctor_credentials', 'show_about', 'about_photo_url', 'about_title', 'about_text',
  'show_stats', 'stat1_number', 'stat1_label', 'stat2_number', 'stat2_label',
  'stat3_number', 'stat3_label', 'show_testimonials', 'whatsapp', 'instagram',
  'facebook', 'tiktok', 'booking_url', 'meta_title', 'meta_description', 'published',
] as const

// center_website_services -- por elemento del array en replace_center_website_services.
const CENTER_WEBSITE_SERVICE_FIELDS = ['name', 'description', 'icon_key', 'color', 'order_index', 'active'] as const

function pick(src: Record<string, unknown>, fields: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const f of fields) if (f in src) out[f] = src[f]
  return out
}

// A diferencia de pick() (que ignora en silencio lo que no está en el
// whitelist), esto RECHAZA explícitamente -- devuelve el primer campo no
// permitido que encuentra, o null si todo está bien. Se usa en
// replace_center_website_services porque ahí el payload es un array de
// objetos armado por el cliente, no un patch de un solo objeto -- vale la
// pena la validación explícita en vez de solo filtrar.
function firstUnknownField(src: Record<string, unknown>, fields: readonly string[]): string | null {
  for (const key of Object.keys(src)) {
    if (!(fields as readonly string[]).includes(key)) return key
  }
  return null
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

      // ── Lab exams (catálogo, P2.2-C1) ──────────────────────────────────────
      case 'list_lab_exams': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        let q = sb.from('lab_exams').select('*').eq('center_id', body.center_id).order('descripcion')
        if (body.activo !== undefined) q = q.eq('activo', !!body.activo)
        const { data, error } = await q
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, exams: data || [] }), { headers: CORS })
      }

      case 'create_lab_exam': {
        const patch = pick(body.patch || {}, LAB_EXAM_CREATE_FIELDS)
        if (!patch.center_id || !patch.descripcion) return fail(400, 'center_id y descripcion son requeridos')
        const { data, error } = await sb.from('lab_exams').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, exam: data }), { headers: CORS })
      }

      case 'update_lab_exam': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, LAB_EXAM_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { error } = await sb.from('lab_exams').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      // ── centers (P2.2-C2) ───────────────────────────────────────────────
      case 'update_center': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, CENTER_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { data: existing } = await sb.from('centers').select('id').eq('id', body.id).maybeSingle()
        if (!existing) return fail(400, 'centro no encontrado')
        const { error } = await sb.from('centers').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      // ── center_services ───────────────────────────────────────────────────
      case 'list_center_services': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_services').select('*')
          .eq('center_id', body.center_id).order('categoria').order('orden')
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, services: data || [] }), { headers: CORS })
      }

      case 'create_center_service': {
        const patch = pick(body.patch || {}, CENTER_SERVICE_CREATE_FIELDS)
        if (!patch.center_id || !patch.nombre) return fail(400, 'center_id y nombre son requeridos')
        const { data, error } = await sb.from('center_services').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, service: data }), { headers: CORS })
      }

      case 'delete_center_service': {
        if (!body.id) return fail(400, 'id requerido')
        const { error } = await sb.from('center_services').delete().eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      // ── center_packages ──────────────────────────────────────────────────
      case 'list_center_packages': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_packages').select('*')
          .eq('center_id', body.center_id).order('orden').order('created_at')
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, packages: data || [] }), { headers: CORS })
      }

      case 'create_center_package': {
        const patch = pick(body.patch || {}, CENTER_PACKAGE_CREATE_FIELDS)
        if (!patch.center_id || !patch.nombre) return fail(400, 'center_id y nombre son requeridos')
        const { data, error } = await sb.from('center_packages').insert(patch).select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, package: data }), { headers: CORS })
      }

      case 'update_center_package': {
        if (!body.id) return fail(400, 'id requerido')
        const patch = pick(body.patch || {}, CENTER_PACKAGE_UPDATE_FIELDS)
        if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
        const { error } = await sb.from('center_packages').update(patch).eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      case 'delete_center_package': {
        if (!body.id) return fail(400, 'id requerido')
        const { error } = await sb.from('center_packages').delete().eq('id', body.id)
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      // ── center_website (P2.2-C3) ───────────────────────────────────────────
      case 'get_center_website': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_website').select('*').eq('center_id', body.center_id).maybeSingle()
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, website: data || null }), { headers: CORS })
      }

      case 'update_center_website': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data: center } = await sb.from('centers').select('id').eq('id', body.center_id).maybeSingle()
        if (!center) return fail(400, 'centro no encontrado')
        const patch = pick(body.patch || {}, CENTER_WEBSITE_UPDATE_FIELDS)
        // updated_at lo pone el servidor, no el cliente -- el payload
        // actual lo manda, pero confiar en el reloj del navegador es
        // innecesario cuando el servidor puede ponerlo con certeza.
        const { data, error } = await sb.from('center_website')
          .upsert({ center_id: body.center_id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'center_id' })
          .select('*').single()
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, website: data }), { headers: CORS })
      }

      // ── center_website_services ──────────────────────────────────────────
      case 'list_center_website_services': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const { data, error } = await sb.from('center_website_services').select('*')
          .eq('center_id', body.center_id).order('order_index')
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, services: data || [] }), { headers: CORS })
      }

      case 'replace_center_website_services': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        const services = Array.isArray(body.services) ? body.services : null
        if (!services) return fail(400, 'services (array) requerido')
        for (let i = 0; i < services.length; i++) {
          const bad = firstUnknownField(services[i] || {}, CENTER_WEBSITE_SERVICE_FIELDS)
          if (bad) return fail(400, `campo no permitido "${bad}" en services[${i}]`)
        }
        const { data, error } = await sb.rpc('replace_center_website_services', {
          p_center_id: body.center_id,
          p_services: services,
        })
        if (error) return fail(400, error.message)
        return new Response(JSON.stringify({ ok: true, services: data || [] }), { headers: CORS })
      }

      // ── center_doctors (P2.2-C4) ───────────────────────────────────────────
      // Sin update_center_doctor -- no existe esa capacidad hoy (orden/
      // horarios/etc. son columnas muertas desde esta tabla, nadie las
      // toca). SELECT público queda intacto, sin cambios -- solo el write.
      case 'list_center_doctors': {
        if (!body.center_id) return fail(400, 'center_id requerido')
        // Incluye el join a medicos que loadLabMedicos() ya necesitaba
        // (antes vía select=medico_id,medicos(...) de PostgREST) -- los
        // campos de más son inofensivos para el otro consumidor (solo lee
        // medico_id de cada fila).
        const { data, error } = await sb.from('center_doctors')
          .select('*, medicos(id,nombre,apellido,titulo)')
          .eq('center_id', body.center_id)
        if (error) return fail(500, error.message)
        return new Response(JSON.stringify({ ok: true, doctors: data || [] }), { headers: CORS })
      }

      case 'add_center_doctor': {
        const centerId = body.center_id, medicoId = body.medico_id
        if (!centerId || !medicoId) return fail(400, 'center_id y medico_id son requeridos')
        const { data: center } = await sb.from('centers').select('id').eq('id', centerId).maybeSingle()
        if (!center) return fail(400, 'center_id no corresponde a un centro real')
        const { data: medico } = await sb.from('medicos').select('id').eq('id', medicoId).maybeSingle()
        if (!medico) return fail(400, 'medico_id no corresponde a un médico real')
        const { error } = await sb.from('center_doctors').insert({ center_id: centerId, medico_id: medicoId })
        if (error) {
          if (error.code === '23505') return fail(400, 'ese médico ya está afiliado a este centro')
          return fail(400, error.message)
        }
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      case 'remove_center_doctor': {
        const centerId = body.center_id, medicoId = body.medico_id
        if (!centerId || !medicoId) return fail(400, 'center_id y medico_id son requeridos')
        const { error } = await sb.from('center_doctors').delete().eq('center_id', centerId).eq('medico_id', medicoId)
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
