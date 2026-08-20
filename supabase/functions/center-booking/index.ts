import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Reserva pública de Doctor Center (P2.2-A, 20 ago 2026) ──────────────────
// center_patients/center_citas tenían policies 100% públicas (qual:true) --
// cualquiera podía leer/editar cédula, teléfono, email de cualquier
// paciente, sin login. RLS no puede expresar "solo búsqueda exacta por
// email/cédula", así que se sacó a anon del acceso directo por completo.
// Esta función reemplaza el find-or-create + insert de cita que antes
// vivía en doctor-center.html (llamadas REST directas con la anon key),
// ahora server-side con service role. Sin auth -- es un flujo de reserva
// anónimo legítimo por diseño, igual que antes -- pero NUNCA devuelve el
// registro del paciente ni resultados de búsqueda, solo confirmación.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

  const centerId  = (body.center_id || '').toString()
  const nombre    = (body.nombre || '').toString().trim()
  const telefono  = (body.telefono || '').toString().trim()
  const email     = body.email ? body.email.toString().trim() : null
  const cedula    = body.cedula ? body.cedula.toString().trim() : null
  const fecha     = body.fecha || null
  const servicios = Array.isArray(body.servicios) ? body.servicios : null
  const totalEst  = typeof body.total_est === 'number' ? body.total_est : null
  const nota      = body.nota ? body.nota.toString().slice(0, 500) : null

  if (!centerId || !nombre || !telefono) {
    return fail(400, 'center_id, nombre y telefono son requeridos')
  }

  // ── Validar centro real y activo antes de crear nada ────────────────────
  const { data: center, error: centerErr } = await sb
    .from('centers')
    .select('id, nombre, email')
    .eq('id', centerId)
    .eq('activo', true)
    .maybeSingle()

  if (centerErr || !center) return fail(400, 'centro inválido')

  try {
    let patientId: string | null = null

    // 1. Buscar paciente existente por email o cédula, scoped al centro
    if (email || cedula) {
      const q = sb.from('center_patients').select('id, telefono, email, cedula').eq('center_id', centerId).limit(1)
      const { data: found } = email ? await q.eq('email', email) : await q.eq('cedula', cedula)
      if (found && found.length) {
        const row = found[0]
        patientId = row.id
        const patch: Record<string, string> = {}
        if (!row.telefono && telefono) patch.telefono = telefono
        if (!row.email && email) patch.email = email
        if (!row.cedula && cedula) patch.cedula = cedula
        if (Object.keys(patch).length) {
          await sb.from('center_patients').update(patch).eq('id', patientId)
        }
      }
    }

    // 2. Crear paciente si no existe
    if (!patientId) {
      const { data: created, error: createErr } = await sb
        .from('center_patients')
        .insert({ center_id: centerId, nombre, email, telefono, cedula, canal: 'web' })
        .select('id')
        .single()
      if (createErr || !created) return fail(500, 'no se pudo registrar el paciente')
      patientId = created.id
    }

    // 3. Crear la cita
    const { data: cita, error: citaErr } = await sb
      .from('center_citas')
      .insert({
        center_id:  centerId,
        patient_id: patientId,
        fecha_pref: fecha,
        hora:       null,
        servicios,
        total_est:  totalEst,
        canal:      'web',
        nota,
      })
      .select('id')
      .single()

    if (citaErr || !cita) return fail(500, 'no se pudo registrar la reserva')

    // 4. Email de aviso al admin del centro (server-side, ya no depende del cliente)
    if (center.email) {
      const leadsServiciosTxt = (servicios || []).map((s: any) => s?.nombre).filter(Boolean).join(', ') || '—'
      fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({
          type: 'center_admin_lead',
          to_email: center.email,
          center_name: center.nombre || '',
          patient_name: nombre,
          lead_id: cita.id,
          telefono,
          email: email || '',
          fecha: fecha || 'Sin fecha',
          hora: 'Por confirmar',
          servicios: leadsServiciosTxt,
          total: totalEst ? '$' + totalEst : '',
        }),
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ ok: true }), { headers: CORS })
  } catch (e) {
    console.error('[center-booking]', e)
    return fail(500, 'error interno')
  }
})
