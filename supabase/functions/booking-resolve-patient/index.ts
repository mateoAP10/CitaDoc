import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Ventanita controlada para el booking público (18 ago 2026) ─────────────
// Reemplaza la lectura directa de `pacientes` que hacía buscarOCrearPaciente()
// desde el cliente. Después de cerrar el SELECT público de `pacientes` (RLS
// por ownership), ese SELECT+INSERT...RETURNING dejó de poder recuperar el
// id del paciente recién creado/encontrado -- el booking seguía creando la
// cita, pero sin paciente_id, perdiendo la deduplicación.
//
// Esta función NO reabre SELECT público -- corre con service role (bypasa
// RLS de forma controlada) y expone ÚNICAMENTE lo mínimo que el booking
// necesita: un id. Nunca nombre, email, teléfono, cédula. La respuesta es
// idéntica exista o no el paciente -- no hay forma de usar esto para
// enumerar quién ya está registrado.
//
// Regla explícita de Mateo: esta función NUNCA confía en un medico_id
// enviado por el cliente para decidir ownership -- de hecho ni lo acepta
// como parámetro. Los pacientes de booking público se crean sin medico_id,
// exactamente igual que hace hoy crearPaciente() en js/shared.js/booking.js.
// La asociación a un médico (si llega a pasar) es un problema aparte, no de
// esta función.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  let body: any
  try { body = await req.json() } catch { return fail(400, 'JSON inválido') }

  const nombre   = (body.nombre || '').toString().trim()
  const email    = (body.email || '').toString().trim() || null
  const telefono = (body.telefono || '').toString().trim() || null
  // P7.2 -- esta función SOLO la llama buscarOCrearPaciente() desde los
  // templates públicos, nunca el dashboard/Assistant -- por eso origen se
  // fija acá mismo, no llega como parámetro del cliente. is_qa sí viaja
  // desde el cliente (?qa=1 -> cdIsQa()), default false si no se manda.
  const isQa     = body.is_qa === true

  if (!nombre) return fail(400, 'falta nombre')
  if (!email && !telefono) return fail(400, 'falta email o telefono')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    let patientId: string | null = null

    // Misma prioridad exacta que buscarOCrearPaciente(): email primero,
    // telefono como respaldo, nunca los dos combinados en una sola condición
    // (mismo comportamiento de hoy, no se cambia la lógica de deduplicación).
    if (email) {
      const existing = await sb.from('pacientes').select('id').eq('email', email).maybeSingle()
      if (existing.data) {
        await sb.from('pacientes').update({ nombre, telefono: telefono || null }).eq('id', existing.data.id)
        patientId = existing.data.id
      }
    } else if (telefono) {
      const existing = await sb.from('pacientes').select('id').eq('telefono', telefono).maybeSingle()
      if (existing.data) patientId = existing.data.id
    }

    if (!patientId) {
      // Sin medico_id -- igual que crearPaciente() hoy. Paciente "sin dueño"
      // hasta que algún médico lo atienda y quede vinculado por otra vía.
      const created = await sb.from('pacientes')
        .insert({ nombre, email, telefono, origen: 'public_widget', is_qa: isQa })
        .select('id').single()
      if (created.error) return fail(500, 'no se pudo crear el paciente')
      patientId = created.data.id
    }

    return new Response(JSON.stringify({ ok: true, patient_id: patientId }), { headers: CORS })
  } catch (err) {
    return fail(500, String((err as Error)?.message || err))
  }
})
