import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// ── Ventanita administrativa para doctor_leads (19 ago 2026) ────────────────
// doctor_leads (pipeline de ventas de captacion de medicos) tenia sus 3
// policies de SELECT/UPDATE/DELETE abiertas a cualquiera, sin login.
// admin.html (unico consumidor cliente) corria con la anon key pura, sin
// sesion -- esas policies eran la UNICA razon por la que funcionaba, no una
// necesidad real. Mismo patron que admin-update-medico: JWT admin (admin_users) +
// service role, whitelist explicito de campos para 'update', 'delete' solo
// por id, 'list' solo devuelve las columnas que admin.html realmente pinta.
//
// scout-leads e invite-doctor ya usan service_role directamente -- no pasan
// por aqui, no les afecta este cambio.

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
}

const LIST_COLUMNS = 'id,instagram_handle,doctor_name,specialty,city,premium_score,score_reason,website_detected,status,demo_slug,instagram_dm_sent,contacted_at,doctor_registered,created_at'

const UPDATE_ALLOWED_FIELDS = ['doctor_registered', 'instagram_dm_sent', 'demo_slug', 'status'] as const

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

  const action = (body.action || '').toString()
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (action === 'list') {
      const { data, error } = await sb.from('doctor_leads').select(LIST_COLUMNS).order('premium_score', { ascending: false }).limit(20)
      if (error) return fail(500, error.message)
      return new Response(JSON.stringify({ ok: true, leads: data }), { headers: CORS })
    }

    if (action === 'update') {
      const id = (body.id || '').toString().trim()
      if (!id) return fail(400, 'falta id')
      const patchIn = body.patch && typeof body.patch === 'object' ? body.patch : {}
      const patch: Record<string, unknown> = {}
      for (const key of UPDATE_ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(patchIn, key)) patch[key] = patchIn[key]
      }
      if (Object.keys(patch).length === 0) return fail(400, 'patch vacío o sin campos permitidos')
      const { error } = await sb.from('doctor_leads').update(patch).eq('id', id)
      if (error) return fail(500, error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    if (action === 'delete') {
      const id = (body.id || '').toString().trim()
      if (!id) return fail(400, 'falta id')
      const { error } = await sb.from('doctor_leads').delete().eq('id', id)
      if (error) return fail(500, error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    return fail(400, 'action inválida')
  } catch (err) {
    return fail(500, String((err as Error)?.message || err))
  }
})
