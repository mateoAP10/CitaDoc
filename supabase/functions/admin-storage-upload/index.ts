import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// ── Ventanita administrativa para Storage (20 ago 2026) ─────────────────────
// centers y growth-creatives son buckets PUBLICOS (public:true, correcto --
// son imagenes que deben verse sin login) pero INSERT/UPDATE no exigian
// ninguna autenticacion -- confirmado reproducible: anon subia imagenes a
// ambos sin sesion. centers ademas tenia DELETE ya intentado por el codigo
// (limpiar portada/logo antes de subir uno nuevo) pero sin ninguna policy
// -- estaba roto, no solo abierto.
//
// Los 3 consumidores reales (admin.html, doctor-center-admin.html,
// js/web-builder-v2.js) corren con la anon key pura, sin sesion real --
// mismo patron que el resto de operaciones admin de este proyecto:
// JWT admin (admin_users) + service role. multipart/form-data en vez de JSON+base64
// -- mas eficiente para archivos binarios, el runtime de Deno lo soporta
// nativamente via req.formData().

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_BUCKETS = ['centers', 'growth-creatives']
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
const MAX_BYTES = 10 * 1024 * 1024 // 10MB -- el limite mas alto de los dos buckets, cada bucket igual aplica el suyo propio

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
}

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method not allowed')

  const auth = await requireAdmin(req)
  if (!auth.ok) return fail(auth.status, auth.error)

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) return fail(400, 'se espera multipart/form-data')

  let form: FormData
  try { form = await req.formData() } catch { return fail(400, 'form-data inválido') }

  const bucket = (form.get('bucket') || '').toString()
  if (!ALLOWED_BUCKETS.includes(bucket)) return fail(400, 'bucket no permitido')

  const action = (form.get('action') || 'upload').toString()
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (action === 'delete') {
      const pathsRaw = (form.get('paths') || '[]').toString()
      let paths: string[]
      try { paths = JSON.parse(pathsRaw) } catch { return fail(400, 'paths inválido') }
      if (!Array.isArray(paths) || paths.length === 0) return fail(400, 'falta paths')
      const { error } = await sb.storage.from(bucket).remove(paths)
      if (error) return fail(500, error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    // action === 'upload' (default)
    const path = (form.get('path') || '').toString().trim()
    if (!path) return fail(400, 'falta path')
    const file = form.get('file')
    if (!(file instanceof File)) return fail(400, 'falta file')
    if (!ALLOWED_MIME.includes(file.type)) return fail(400, 'tipo de archivo no permitido: ' + file.type)
    if (file.size > MAX_BYTES) return fail(400, 'archivo demasiado grande')

    const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
    if (error) return fail(500, error.message)

    const { data } = sb.storage.from(bucket).getPublicUrl(path)
    return new Response(JSON.stringify({ ok: true, publicUrl: data.publicUrl }), { headers: CORS })
  } catch (err) {
    return fail(500, String((err as Error)?.message || err))
  }
})
