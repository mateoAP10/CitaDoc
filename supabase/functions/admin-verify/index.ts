import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_TOKEN     = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'
const SEND_EMAIL_URL  = `${SUPABASE_URL}/functions/v1/send-email`

const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-admin-token',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = req.headers.get('x-admin-token')
  if (token !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })
  }

  const url      = new URL(req.url)
  const resource = url.searchParams.get('resource') || 'verificaciones'

  // ── STATS ─────────────────────────────────────────────────────────────────
  if (resource === 'stats') {
    const [rMed, rPac, rCon, rCit, rGui] = await Promise.all([
      sb.from('medicos').select('id,especialidades,ciudad,plan,verificacion_estado,created_at'),
      sb.from('pacientes').select('id,fecha_nacimiento,ciudad,created_at'),
      sb.from('consultas').select('id,created_at'),
      sb.from('citas').select('id,estado,created_at'),
      sb.from('clinical_guidelines').select('id,categoria,fuente,anio'),
    ])
    return new Response(JSON.stringify({
      ok: true,
      medicos:   rMed.data   || [],
      pacientes: rPac.data   || [],
      consultas: rCon.data   || [],
      citas:     rCit.data   || [],
      guias:     rGui.data   || [],
    }), { headers: CORS })
  }

  // ── PROMOS ────────────────────────────────────────────────────────────────
  if (resource === 'promos') {
    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
      return new Response(JSON.stringify({ data }), { headers: CORS })
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'crear') {
        const { code, discount_pct, max_uses, expires_at } = body
        if (!code || !discount_pct) return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: CORS })
        const { data, error } = await sb.from('promo_codes').insert({
          code: code.toUpperCase(),
          discount_pct,
          max_uses: max_uses || null,
          expires_at: expires_at || null,
        }).select().single()
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
        return new Response(JSON.stringify({ ok: true, data }), { headers: CORS })
      }

      if (body.action === 'desactivar') {
        const { id } = body
        if (!id) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400, headers: CORS })
        const { error } = await sb.from('promo_codes').update({ active: false }).eq('id', id)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
        return new Response(JSON.stringify({ ok: true }), { headers: CORS })
      }

      return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: CORS })
    }
  }

  // ── VERIFICACIONES ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('medicos')
      .select('id, nombre, apellido, titulo, email, especialidades, verificacion_estado, cedula_doc_url, titulo_doc_url, created_at')
      .in('verificacion_estado', ['en_revision', 'verificado', 'rechazado'])
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ data }), { headers: CORS })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { medico_id, action } = body

    if (!medico_id || !['aprobar', 'rechazar'].includes(action)) {
      return new Response(JSON.stringify({ error: 'invalid params' }), { status: 400, headers: CORS })
    }

    const nuevo_estado = action === 'aprobar' ? 'verificado' : 'rechazado'

    const { data: med } = await sb
      .from('medicos')
      .select('nombre, apellido, titulo, email')
      .eq('id', medico_id)
      .single()

    const { error } = await sb
      .from('medicos')
      .update({ verificacion_estado: nuevo_estado })
      .eq('id', medico_id)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })

    if (med?.email) {
      fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:     'verification_result',
          to_email: med.email,
          nombre:   med.nombre || '',
          apellido: med.apellido || '',
          titulo:   med.titulo || 'Dr.',
          aprobado: action === 'aprobar',
        }),
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ ok: true, nuevo_estado }), { headers: CORS })
  }

  return new Response('Method not allowed', { status: 405 })
})
