import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Ventanita administrativa para generated_demos (20 ago 2026) ────────────
// anon_update_demos + authenticated_update_demos permitian que cualquiera,
// con o sin login, modificara cualquier campo de cualquier demo --
// confirmado fraude real: anon marcaba payment_status='paid' sin pagar.
//
// admin.html (deployDemo/retractDemo/publish) y js/web-builder-v2.js
// (_deployWeb, solo en modo isAdmin:true) necesitan legitimamente
// actualizar el demo de OTRO medico -- un operador activando el sitio
// generado de alguien mas. Mismo patron que admin-update-medico:
// x-admin-token + service role, whitelist explicito -- nunca reenvia un
// objeto arbitrario de generated_demos.
//
// En modo dashboard (isAdmin:false, un medico publicando su PROPIO demo)
// sigue con el .update() directo de siempre -- eso ya esta cubierto por
// la nueva policy de ownership (medico_id = el propio medico logueado) y
// no debe pasar por aqui.
//
// payment_status SIGUE en el whitelist a proposito -- no se resuelve en
// este bloque, es una decision de negocio aparte (documentada). Este
// cambio no reduce ni amplia lo que el admin ya podia hacer, solo cierra
// quien mas podia hacerlo.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_TOKEN          = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-admin-token',
  'Content-Type': 'application/json',
}

// Union de lo que realmente necesitan los dos consumidores admin reales:
// admin.html (toggles simples: activar/retirar/publicar) y
// js/web-builder-v2.js en modo isAdmin:true (guardar/desplegar el sitio
// completo de OTRO medico -- contenido incluido, no solo estado).
const ALLOWED_FIELDS = [
  'activated_at', 'status', 'medico_id', 'published_at', 'publish_channel', 'payment_status',
  'doctor_name', 'specialty', 'web_config_jsonb', 'web_settings', 'dna', 'photo_url', 'logo_url',
] as const

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  const token = req.headers.get('x-admin-token')
  if (token !== ADMIN_TOKEN) return fail(401, 'unauthorized')

  let body: any
  try { body = await req.json() } catch { return fail(400, 'JSON inválido') }

  const slug = (body.slug || '').toString().trim()
  if (!slug) return fail(400, 'falta slug')

  const patchIn = body.patch && typeof body.patch === 'object' ? body.patch : {}
  const patch: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patchIn, key)) patch[key] = patchIn[key]
  }
  if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { error } = await sb.from('generated_demos').update(patch).eq('slug', slug)
    if (error) return fail(500, error.message)
    return new Response(JSON.stringify({ ok: true }), { headers: CORS })
  } catch (err) {
    return fail(500, String((err as Error)?.message || err))
  }
})
