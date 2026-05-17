import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

// ── Slug generator ────────────────────────────────────────────────────────────

export function generateSubslug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove accents
    .replace(/^(dra?\.?\s+)/i, '')                       // strip Dr./Dra.
    .replace(/[^a-z0-9\s]/g, '')                         // only alphanumeric
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)                           // eliminar iniciales (P., J., etc.)
    .slice(0, 2)                                          // nombre + primer apellido
    .join('-')

  return 'dr-' + cleaned
}

// ── Availability checker ──────────────────────────────────────────────────────

async function isAvailable(slug: string, sb: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await sb
    .from('medicos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  return !data
}

// ── Suggestion generator ──────────────────────────────────────────────────────

async function findAvailable(
  base: string,
  sb: ReturnType<typeof createClient>
): Promise<string> {
  if (await isAvailable(base, sb)) return base

  // Try with specialty suffix or numbers
  for (let i = 2; i <= 9; i++) {
    const candidate = `${base}-${i}`
    if (await isAvailable(candidate, sb)) return candidate
  }
  // Fallback: add random suffix
  const suffix = Math.random().toString(36).slice(2, 5)
  return `${base}-${suffix}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const { name, preferred } = body

    if (!name?.trim() && !preferred?.trim()) {
      return json({ error: 'name o preferred son requeridos' }, 400)
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Si viene un slug preferido, validarlo directamente
    if (preferred?.trim()) {
      const clean = preferred.trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const available = await isAvailable(clean, sb)
      const suggestion = available ? clean : await findAvailable(clean, sb)

      return json({
        requested:   clean,
        available,
        suggested:   suggestion,
        subdomain:   `${suggestion}.citadoc.lat`,
        url:         `https://${suggestion}.citadoc.lat`,
      })
    }

    // Generar desde nombre
    const base       = generateSubslug(name)
    const available  = await isAvailable(base, sb)
    const suggested  = available ? base : await findAvailable(base, sb)

    return json({
      generated:  base,
      available,
      suggested,
      subdomain:  `${suggested}.citadoc.lat`,
      url:        `https://${suggested}.citadoc.lat`,
      preview:    `El sitio del médico será: ${suggested}.citadoc.lat`,
    })

  } catch (err) {
    console.error('check-subslug error:', err)
    return json({ error: 'Error interno' }, 500)
  }
})
