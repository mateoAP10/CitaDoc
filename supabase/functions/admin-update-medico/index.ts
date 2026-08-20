import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// ── Ventanita controlada para operaciones admin cross-doctor sobre medicos
// (18 ago 2026, auditoria global RLS/Storage, Hallazgo #1 bloque 1) ────────
//
// La policy "Authenticated can update doctors" (USING(true) WITH CHECK(true),
// rol authenticated) permitia que CUALQUIER medico logueado modificara el
// perfil de CUALQUIER OTRO -- plan, activo, verificacion_estado, slug,
// web_config, etc. Confirmado reproducible contra produccion. Se elimino esa
// policy; las de ownership (auth.uid() = user_id) quedan intactas para que
// cada medico siga editando SOLO su propio perfil.
//
// admin.html (activarWebSitio) y js/web-builder-v2.js (_deployWeb, solo en
// modo isAdmin:true) necesitan legitimamente actualizar el perfil de OTRO
// medico -- un operador activando el sitio generado de un medico que no es
// el que esta logueado. Esta funcion reemplaza esos .update() directos:
// mismo patron que admin-verify/invite-doctor (JWT admin, admin_users + service
// role), pero con un whitelist explicito de campos -- nunca acepta un
// objeto arbitrario de medicos.
//
// Cuando web-builder-v2.js corre en modo dashboard (isAdmin:false, un medico
// publicando su PROPIO sitio), sigue usando el .update() directo de
// siempre -- eso ya esta correctamente cubierto por la policy de ownership
// y no debe pasar por aqui.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
}

// Unicos campos que esta operacion administrativa tiene motivo real para
// tocar (activar/sincronizar un sitio generado). Cualquier otra clave en el
// body se ignora -- nunca se reenvia el objeto tal cual a Postgres.
// NOTA: logo_url NO es columna real de medicos (solo foto_url existe) --
// web-builder-v2.js la manda en su payload por un bug preexistente ajeno a
// esto (afecta también la ruta isAdmin:false, sin tocar). Se excluye aquí
// a propósito para no heredar ese error en la ruta admin.
const ALLOWED_FIELDS = [
  'web_status', 'plan', 'plan_activo', 'activo',
  'foto_url', 'whatsapp', 'whatsapp_activo', 'web_config',
] as const

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  const auth = await requireAdmin(req)
  if (!auth.ok) return fail(auth.status, auth.error)

  let body: any
  try { body = await req.json() } catch { return fail(400, 'JSON inválido') }

  const id = (body.id || '').toString().trim()
  if (!id) return fail(400, 'falta id')

  const patchIn = body.patch && typeof body.patch === 'object' ? body.patch : {}
  const patch: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patchIn, key)) patch[key] = patchIn[key]
  }
  if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { error } = await sb.from('medicos').update(patch).eq('id', id)
    if (error) return fail(500, error.message)
    return new Response(JSON.stringify({ ok: true }), { headers: CORS })
  } catch (err) {
    return fail(500, String((err as Error)?.message || err))
  }
})
