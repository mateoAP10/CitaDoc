import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

// P2.3-C1 -- analytics-reader esta catalogada como Admin en el inventario
// de admin-agents pero aceptaba cualquier JWT (verify_jwt=true = "algun
// usuario autenticado", no admin). Expone metricas de negocio internas
// (conversion, views, CTR) y doctor_name de TODOS los generated_demos --
// cualquier medico logueado podia leerlo. admin.html ademas mandaba la
// anon key en vez del JWT real de admin (_ADMIN_JWT, ya usado
// correctamente en otras llamadas del mismo archivo, ej. meta-campaigns).
// Sin ownership por medico: el recurso es global/admin, no de un medico
// puntual -- requireAdmin(req) alcanza, sin allowServiceRole (unico
// caller real es admin.html).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: CORS })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = await requireAdmin(req)
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status)
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: demos, error } = await sb
      .from('generated_demos')
      .select('slug, doctor_name, specialty, dna, views, whatsapp_clicks, status, created_at, showcase_content')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!demos || demos.length === 0) return json({ message: 'No hay demos aún', demos_total: 0 })

    // ── Agregaciones ────────────────────────────────────────────────────────

    const total        = demos.length
    const activated    = demos.filter(d => d.status === 'active' || d.status === 'published').length
    const total_views  = demos.reduce((s, d) => s + (d.views || 0), 0)
    const total_clicks = demos.reduce((s, d) => s + (d.whatsapp_clicks || 0), 0)
    const avg_views    = total > 0 ? +(total_views / total).toFixed(1) : 0
    const ctr          = total_views > 0 ? +((total_clicks / total_views) * 100).toFixed(1) : 0

    // Top specialty por demos generados
    const by_specialty = demos.reduce((acc, d) => {
      const key = d.specialty || 'unknown'
      if (!acc[key]) acc[key] = { demos: 0, views: 0, clicks: 0 }
      acc[key].demos++
      acc[key].views  += d.views || 0
      acc[key].clicks += d.whatsapp_clicks || 0
      return acc
    }, {} as Record<string, { demos: number; views: number; clicks: number }>)

    const top_specialty = Object.entries(by_specialty)
      .sort((a, b) => b[1].views - a[1].views)[0]?.[0] || null

    // Top DNA por views
    const by_dna = demos.reduce((acc, d) => {
      const key = d.dna || 'unknown'
      if (!acc[key]) acc[key] = { demos: 0, views: 0, clicks: 0 }
      acc[key].demos++
      acc[key].views  += d.views || 0
      acc[key].clicks += d.whatsapp_clicks || 0
      return acc
    }, {} as Record<string, { demos: number; views: number; clicks: number }>)

    const top_dna = Object.entries(by_dna)
      .sort((a, b) => b[1].views - a[1].views)[0]?.[0] || null

    // Demo con mayor CTR (clicks / views)
    const best_ctr_demo = demos
      .filter(d => d.views > 0)
      .map(d => ({
        slug: d.slug,
        doctor: d.doctor_name,
        specialty: d.specialty,
        views: d.views,
        clicks: d.whatsapp_clicks,
        ctr: +((d.whatsapp_clicks / d.views) * 100).toFixed(1),
      }))
      .sort((a, b) => b.ctr - a.ctr)[0] || null

    // Demo más visto
    const most_viewed = [...demos]
      .sort((a, b) => (b.views || 0) - (a.views || 0))[0]

    // Showcase coverage
    const with_showcase = demos.filter(d => d.showcase_content).length

    // ── Resumen operacional ─────────────────────────────────────────────────

    return json({
      generated_at: new Date().toISOString(),

      overview: {
        demos_total:      total,
        demos_activated:  activated,
        conversion_rate:  total > 0 ? +((activated / total) * 100).toFixed(1) + '%' : '0%',
        total_views,
        total_wa_clicks:  total_clicks,
        avg_views_per_demo: avg_views,
        overall_ctr:      ctr + '%',
        showcases_ready:  with_showcase,
      },

      top_patterns: {
        top_specialty,
        top_dna,
        specialty_breakdown: by_specialty,
        dna_breakdown:       by_dna,
      },

      best_demos: {
        highest_ctr:   best_ctr_demo,
        most_viewed:   most_viewed ? {
          slug:      most_viewed.slug,
          doctor:    most_viewed.doctor_name,
          specialty: most_viewed.specialty,
          views:     most_viewed.views,
          clicks:    most_viewed.whatsapp_clicks,
        } : null,
      },

      all_demos: demos.map(d => ({
        slug:      d.slug,
        doctor:    d.doctor_name,
        specialty: d.specialty,
        dna:       d.dna,
        status:    d.status,
        views:     d.views || 0,
        wa_clicks: d.whatsapp_clicks || 0,
        showcase:  !!d.showcase_content,
        created:   d.created_at?.slice(0, 10),
      })),
    })

  } catch (err) {
    console.error('analytics-reader error:', err)
    return json({ error: 'Error interno' }, 500)
  }
})
