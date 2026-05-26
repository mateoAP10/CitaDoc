import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const url = new URL(req.url)
    const country = url.searchParams.get('country') || ''
    const city    = url.searchParams.get('city')    || ''
    const specialty = url.searchParams.get('specialty') || ''
    const insurance = url.searchParams.get('insurance') || ''
    const search  = url.searchParams.get('search')  || ''
    const limit   = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset  = parseInt(url.searchParams.get('offset') || '0', 10)

    let query = sb
      .from('medicos')
      .select('id,nombre,apellido,titulo,especialidades,ciudad,pais,precio,foto_url,plan,whatsapp,whatsapp_activo,seguros,horario_desde,horario_hasta,dias_atencion,slug,activo,email,verificacion_estado')
      .eq('activo', true)

    if (country) {
      query = query.eq('pais', country)
    }

    if (city) {
      query = query.ilike('ciudad', `%${city}%`)
    }

    if (specialty) {
      query = query.contains('especialidades', [specialty])
    }

    if (insurance) {
      query = query.contains('seguros', [insurance])
    }

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,titulo.ilike.%${search}%`)
    }

    query = query
      .order('plan', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[search-doctors] error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({
      ok: true,
      data: data || [],
      count: data?.length || 0,
      meta: { country, city, specialty, insurance, search, limit, offset }
    }), { headers: CORS })

  } catch (err) {
    console.error('[search-doctors] exception:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: CORS })
  }
})
