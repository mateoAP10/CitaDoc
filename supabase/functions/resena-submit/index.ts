import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getClientIp } from '../_shared/rate-limit.ts'

// ── P6.1 -- Eje 2c (30 ago 2026) ─────────────────────────────────────────────
// Reemplaza la escritura directa (anon key) de resena.html a `resenas`.
// El paciente sigue siendo anónimo -- verify_jwt=false, sin sesión nueva,
// sin token nuevo. cita_id sigue siendo el identificador del link existente
// (ya no descubrible públicamente desde Eje 1). Lo que agrega esta función
// es lo que la RLS de `resenas` ya validaba pero el service role de
// cita-review (Eje 2b, ahora neutralizado) bypasseaba: que `medico_id`
// coincida con el dueño real de la cita, más elegibilidad (no cancelada, ya
// ocurrida) y anti-fraude (rate-limit + una sola escritura por cita, atómica).
//
// Orden de validación deliberado (pedido explícito de Mateo): shape ->
// existencia de la cita -> ownership/elegibilidad -> RECIÉN AHÍ rate-limit ->
// escritura. Un cita_id inexistente o no elegible nunca llega a tocar
// ai_rate_limits -- el endpoint no puede usarse para sembrar filas ahí con
// UUIDs arbitrarios, solo con citas reales y elegibles (que además, tras
// Eje 1, ya no son enumerables desde afuera).

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}
function ok() {
  return new Response(JSON.stringify({ ok: true }), { headers: CORS })
}
function isValidStars(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  let body: any
  try { body = await req.json() } catch { return fail(400, 'JSON inválido') }

  const citaId       = (body.cita_id || '').toString()
  const medicoId      = body.medico_id ? body.medico_id.toString() : null
  const ratingMedico  = body.rating_medico != null ? Number(body.rating_medico) : null
  const ratingApp     = body.rating_app != null ? Number(body.rating_app) : null
  const comentario    = body.comentario ? body.comentario.toString().trim().slice(0, 500) || null : null

  // ── 1. Shape -- nada de esto toca la base todavía ──────────────────────────
  if (!UUID_RE.test(citaId)) return fail(400, 'cita_id inválido')
  if (ratingMedico == null && ratingApp == null) return fail(400, 'falta rating_medico o rating_app')
  if (ratingMedico != null && !isValidStars(ratingMedico)) return fail(400, 'rating_medico inválido')
  if (ratingApp != null && !isValidStars(ratingApp)) return fail(400, 'rating_app inválido')
  if (ratingMedico != null && !medicoId) return fail(400, 'falta medico_id')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // ── 2. Existencia real de la cita ───────────────────────────────────────────
  const { data: cita, error: citaErr } = await sb
    .from('citas')
    .select('id, medico_id, estado, fecha')
    .eq('id', citaId)
    .maybeSingle()

  if (citaErr || !cita) return fail(400, 'cita inválida')

  // ── 3. Ownership -- solo aplica a la rama de rating_medico ──────────────────
  if (ratingMedico != null && cita.medico_id !== medicoId) {
    return fail(403, 'medico_id no coincide con el médico real de esta cita')
  }

  // ── 4. Elegibilidad -- misma ventana semántica que ya usa review-drip ──────
  if (cita.estado === 'cancelada') return fail(400, 'esta cita fue cancelada')
  const today = new Date().toISOString().split('T')[0]
  if (cita.fecha > today) return fail(400, 'esta cita todavía no ocurrió')

  // ── 5. Rate-limit -- recién acá, con la cita ya confirmada real y elegible ──
  const rl = await checkRateLimit('resena_submit', citaId, getClientIp(req))
  if (!rl.allowed) return fail(429, rl.reason || 'demasiados intentos, esperá unos minutos')

  // ── 6. Escritura ─────────────────────────────────────────────────────────
  if (ratingMedico != null) {
    // Atómico de verdad: resenas.cita_id tiene UNIQUE real (resenas_cita_id_key).
    // ignoreDuplicates -> INSERT ... ON CONFLICT (cita_id) DO NOTHING. Si dos
    // requests simultáneos llegan acá, Postgres resuelve el conflicto -- solo
    // uno inserta, el otro recibe 0 filas. No hay ventana de SELECT-then-write.
    const { data: inserted, error: insErr } = await sb
      .from('resenas')
      .upsert(
        { cita_id: citaId, medico_id: medicoId, rating_medico: ratingMedico, comentario },
        { onConflict: 'cita_id', ignoreDuplicates: true }
      )
      .select('id')

    if (insErr) return fail(500, 'no se pudo guardar la reseña')
    if (!inserted || inserted.length === 0) return fail(409, 'esta cita ya fue evaluada')
    return ok()
  }

  // Rama rating_app: solo tiene sentido sobre una reseña principal ya
  // existente (mismo comportamiento que resena.html siempre asumió, ahora
  // exigido de verdad en el servidor). Un UPDATE con WHERE ya es atómico por
  // sí solo -- no hace falta la misma protección de conflicto de arriba.
  const { data: updated, error: updErr } = await sb
    .from('resenas')
    .update({ rating_app: ratingApp })
    .eq('cita_id', citaId)
    .not('rating_medico', 'is', null)
    .select('id')

  if (updErr) return fail(500, 'no se pudo guardar')
  if (!updated || updated.length === 0) return fail(400, 'todavía no hay una reseña principal para esta cita')
  return ok()
})
