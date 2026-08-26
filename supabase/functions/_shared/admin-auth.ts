import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getClientIp } from './rate-limit.ts'

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
//
// Observabilidad -- logs de acciones admin: instrumentado aca adentro,
// no en cada una de las ~20 funciones que llaman requireAdmin(). action/
// resource_type se derivan de la URL (nombre de la Edge Function),
// resource_id es best-effort desde el body (solo id/slug/medico_id --
// nunca el body completo, nunca tokens, nunca datos clinicos). El log
// es fail-open: si falla la escritura, se traga el error y la funcion
// sigue devolviendo el resultado real de auth sin alterarlo -- un bug
// del logger nunca debe convertir un 403 en 500 ni bloquear una accion
// admin legitima.

export type AdminAuthResult =
  | { ok: true; userId: string | null; viaServiceRole: boolean }
  | { ok: false; status: 401 | 403; error: string; userId?: string | null }

// Campos genericos que es seguro exponer como resource_id -- nunca
// email, nunca contenido clinico, nunca nada de texto libre.
const RESOURCE_ID_FIELDS = ['id', 'slug', 'medico_id']

async function peekResourceId(req: Request): Promise<string | null> {
  try {
    const body = await req.clone().json()
    for (const f of RESOURCE_ID_FIELDS) {
      if (body?.[f] && typeof body[f] === 'string') return body[f]
    }
  } catch {
    // sin body / no-JSON / GET -- no hay resource_id, no es un error
  }
  const url = new URL(req.url)
  return url.searchParams.get('id') || url.searchParams.get('slug') || null
}

function actionFromUrl(req: Request): string {
  const path = new URL(req.url).pathname
  return path.split('/').filter(Boolean).pop() || 'unknown'
}

async function logAdminAction(
  sb: ReturnType<typeof createClient>,
  req: Request,
  result: AdminAuthResult,
): Promise<void> {
  // requireAdmin la llaman ~27 funciones, incluidas todas las de Grupo A
  // (crons horarios/diarios). Loguear cada exito de service_role
  // inundaria la tabla con ruido de sistema que no es "una accion
  // admin" en el sentido de este bloque -- se omite a proposito. Los
  // rechazos (401/403) SI se loguean siempre, de cualquier funcion:
  // es la senal de abuso mas directa (alguien probando un endpoint que
  // ya cerramos), independiente de quien lo intento.
  if (result.ok && result.viaServiceRole) return

  try {
    const action = actionFromUrl(req)
    const resource_id = await peekResourceId(req)
    const actor_user_id = result.ok ? result.userId : (result.userId ?? null)

    await sb.from('admin_action_logs').insert({
      actor_user_id,
      action,
      resource_type: action,
      resource_id,
      result: result.ok ? 'success' : 'denied',
      ip: getClientIp(req),
      metadata: result.ok
        ? { via_service_role: result.viaServiceRole }
        : { error: result.error, status: result.status },
    })
  } catch {
    // fail-open: un fallo del logger nunca bloquea ni altera la
    // operacion admin real.
  }
}

export async function requireAdmin(
  req: Request,
  opts: { allowServiceRole?: boolean } = {},
): Promise<AdminAuthResult> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(SUPABASE_URL, SUPABASE_SRV, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const result = await resolveAdmin(req, opts, sb)
  await logAdminAction(sb, req, result)
  return result
}

async function resolveAdmin(
  req: Request,
  opts: { allowServiceRole?: boolean },
  sb: ReturnType<typeof createClient>,
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'unauthorized', userId: null }
  }
  const jwt = authHeader.slice('Bearer '.length).trim()

  const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (opts.allowServiceRole && jwt === SUPABASE_SRV) {
    return { ok: true, userId: null, viaServiceRole: true }
  }

  const { data: userData, error: userErr } = await sb.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: 'unauthorized', userId: null }
  }

  const { data: adminRow } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!adminRow) {
    return { ok: false, status: 403, error: 'forbidden', userId: userData.user.id }
  }

  return { ok: true, userId: userData.user.id, viaServiceRole: false }
}
