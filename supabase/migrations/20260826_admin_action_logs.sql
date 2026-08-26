-- Observabilidad -- logs de acciones administrativas.
-- Instrumentado en un unico chokepoint (requireAdmin() en
-- _shared/admin-auth.ts), no en cada una de las ~20 funciones admin.
-- Sin PII clinica, sin secretos, sin body completo -- ver comentario en
-- admin-auth.ts para el detalle de que se guarda en metadata.

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id   UUID,                    -- null si no se pudo resolver identidad (401 sin JWT valido)
  action          TEXT        NOT NULL,    -- nombre de la Edge Function (derivado de la URL)
  resource_type   TEXT,                    -- mismo valor que action hoy (v1); deja lugar a granularidad futura
  resource_id     TEXT,                    -- best-effort desde el body (id/slug/medico_id), null si no aplica
  result          TEXT        NOT NULL CHECK (result IN ('success','denied','error')),
  ip              TEXT,
  metadata        JSONB       DEFAULT '{}'::jsonb
);

-- Via allanada crece sin parar -- indices para las consultas obvias de
-- lectura/alertas que vienen despues (por fecha, por actor, por accion).
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
  ON public.admin_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_actor_user_id
  ON public.admin_action_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_created_at
  ON public.admin_action_logs (action, created_at DESC);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
-- Solo service_role escribe/lee (via Edge Functions) -- sin policy
-- publica ni para authenticated, mismo criterio que ai_rate_limits.
