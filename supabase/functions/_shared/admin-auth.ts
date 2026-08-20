import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// P2.1 -- Admin Auth real. Reemplaza el shared secret (x-admin-token /
// '7citadoc7') por identidad real: el caller manda su JWT de sesion de
// Supabase Auth en `Authorization: Bearer <jwt>`, se valida contra
// auth.getUser(), y se verifica que ese user_id este en admin_users.
//
// allowServiceRole: true habilita ademas aceptar el service_role key
// exacto como Bearer -- para automatizaciones server-to-server (cron /
// Scheduled Triggers), NUNCA para llamadas desde HTML/JS. Usar solo en
// funciones que legitimamente pueden ser disparadas por un cron
// (ej. actualizar-guias-clinicas), no en las administrativas normales.

export type AdminAuthResult =
  | { ok: true; userId: string | null; viaServiceRole: boolean }
  | { ok: false; status: 401 | 403; error: string }

export async function requireAdmin(
  req: Request,
  opts: { allowServiceRole?: boolean } = {},
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'unauthorized' }
  }
  const jwt = authHeader.slice('Bearer '.length).trim()

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (opts.allowServiceRole && jwt === SUPABASE_SRV) {
    return { ok: true, userId: null, viaServiceRole: true }
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SRV, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userErr } = await sb.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: 'unauthorized' }
  }

  const { data: adminRow } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!adminRow) {
    return { ok: false, status: 403, error: 'forbidden' }
  }

  return { ok: true, userId: userData.user.id, viaServiceRole: false }
}
